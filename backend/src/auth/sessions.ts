import { createHash, randomBytes, randomUUID } from "node:crypto";
import { authEnv } from "../config/env.js";
import { prisma } from "../db/client.js";
import type { Session } from "../generated/prisma/client.js";
import { unauthorized } from "../lib/httpError.js";

/**
 * Refresh-token sessions.
 *
 * Tokens are opaque random bytes, not JWTs, so they can be revoked server-side
 * the instant something looks wrong. Only the SHA-256 hash is stored: a dump of
 * the Session table does not hand an attacker a single working session.
 *
 * Every use rotates the token. Presenting an already-rotated token is treated
 * as theft and revokes the entire rotation family — see `rotateSession`.
 */

/** Entropy per refresh token. 256 bits is far beyond brute-forceable. */
const TOKEN_BYTES = 32;

/**
 * How long an already-rotated token still works.
 *
 * Two tabs can hit /refresh in the same instant with the same cookie. One wins;
 * the other arrives milliseconds later holding a token that was just revoked.
 * Without this window that harmless race looks identical to token theft and
 * logs the user out of everything.
 *
 * The trade-off is explicit: a stolen token replayed within this window is
 * accepted. Five seconds is long enough to cover the race and short enough that
 * it is not a meaningful attack surface.
 */
const ROTATION_GRACE_MS = 5_000;

/**
 * Hard ceiling on a rolling session, regardless of activity.
 *
 * Without it, "30 days from last use" means an active session never expires and
 * a device compromised a year ago is still trusted.
 */
const ABSOLUTE_LIFETIME_DAYS = 90;

export type SessionContext = {
  userAgent?: string | null;
  ip?: string | null;
};

/**
 * Hashes a raw refresh token for storage and lookup.
 *
 * SHA-256 (not argon2) is correct here: the input is 256 bits of entropy we
 * generated, so there is no dictionary to attack and no need to be slow.
 */
export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Generates a new opaque refresh token.
 */
function generateRefreshToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Computes a session's expiry, clamped to the family's absolute lifetime.
 */
function resolveExpiry(familyStartedAt: Date): Date {
  const env = authEnv();
  const rolling = Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000;
  const absolute =
    familyStartedAt.getTime() + ABSOLUTE_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Math.min(rolling, absolute));
}

export type IssuedSession = {
  session: Session;
  /** The raw token — returned once, never stored, never logged. */
  token: string;
};

/**
 * Starts a brand-new session family (a fresh login).
 */
export async function createSession(
  userId: string,
  context: SessionContext = {},
): Promise<IssuedSession> {
  const token = generateRefreshToken();
  const familyStartedAt = new Date();

  const session = await prisma.session.create({
    data: {
      userId,
      familyId: randomUUID(),
      familyStartedAt,
      refreshTokenHash: hashRefreshToken(token),
      userAgent: context.userAgent?.slice(0, 400) ?? null,
      ip: context.ip ?? null,
      expiresAt: resolveExpiry(familyStartedAt),
    },
  });

  return { session, token };
}

/**
 * Creates the next session in an existing family and retires the current one.
 *
 * Returns null when another request rotated the same session first. The retire
 * is a conditional update on `revokedAt: null`, so exactly one concurrent
 * caller can win and the loser is routed to the grace-window path instead of
 * silently forking the family into two live tokens.
 */
async function rotateFrom(
  current: Session,
  context: SessionContext,
): Promise<IssuedSession | null> {
  const token = generateRefreshToken();

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.session.updateMany({
      where: { id: current.id, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: "rotated",
        lastUsedAt: new Date(),
      },
    });

    if (claimed.count === 0) return null;

    const next = await tx.session.create({
      data: {
        userId: current.userId,
        familyId: current.familyId,
        familyStartedAt: current.familyStartedAt,
        refreshTokenHash: hashRefreshToken(token),
        userAgent: context.userAgent?.slice(0, 400) ?? current.userAgent,
        ip: context.ip ?? current.ip,
        expiresAt: resolveExpiry(current.familyStartedAt),
      },
    });

    await tx.session.update({
      where: { id: current.id },
      data: { replacedById: next.id },
    });

    return { session: next, token };
  });
}

/**
 * Revokes every session in a rotation family.
 *
 * Called when a retired token is replayed outside the grace window: we cannot
 * tell whether the legitimate user or an attacker holds the newer token, so we
 * invalidate both and force a fresh login.
 */
export async function revokeFamily(
  familyId: string,
  reason: string,
): Promise<void> {
  await prisma.session.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

/**
 * Finds the live session in a family, if one exists.
 */
async function findFamilyHead(familyId: string): Promise<Session | null> {
  return prisma.session.findFirst({
    where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export type RotationResult = IssuedSession & {
  userId: string;
};

/**
 * Exchanges a refresh token for the next one in its family.
 *
 * Outcomes:
 *  - unknown token            → SESSION_EXPIRED
 *  - expired token            → SESSION_EXPIRED
 *  - retired, within grace    → rotate from the family's live head (tab race)
 *  - retired, outside grace   → SESSION_REUSED, whole family revoked
 *  - live token               → rotate normally
 */
export async function rotateSession(
  rawToken: string,
  context: SessionContext = {},
): Promise<RotationResult> {
  const current = await prisma.session.findUnique({
    where: { refreshTokenHash: hashRefreshToken(rawToken) },
  });

  if (!current) {
    throw unauthorized("SESSION_EXPIRED", "Please sign in again.");
  }

  if (current.revokedAt) {
    const age = Date.now() - current.revokedAt.getTime();
    const wasRotated = current.revokedReason === "rotated";

    if (wasRotated && age <= ROTATION_GRACE_MS) {
      const head = await findFamilyHead(current.familyId);
      if (head) {
        const issued = await rotateFrom(head, context);
        if (issued) return { ...issued, userId: head.userId };
        // Lost a second race. The caller retries with the cookie the winner set.
        throw unauthorized("SESSION_EXPIRED", "Please retry.");
      }
    }

    // Either a genuinely replayed token, or a family that was already killed.
    // We cannot tell the legitimate holder from the thief, so both lose access.
    await revokeFamily(current.familyId, "reuse_detected");
    throw unauthorized(
      "SESSION_REUSED",
      "This session is no longer valid. For your security, please sign in again.",
      { userId: current.userId },
    );
  }

  if (current.expiresAt.getTime() <= Date.now()) {
    throw unauthorized("SESSION_EXPIRED", "Please sign in again.");
  }

  const issued = await rotateFrom(current, context);
  if (!issued) {
    // Another request rotated this exact session between our read and write.
    // Fall back to the family's live head rather than crying theft.
    const head = await findFamilyHead(current.familyId);
    if (head) {
      const retry = await rotateFrom(head, context);
      if (retry) return { ...retry, userId: head.userId };
    }
    throw unauthorized("SESSION_EXPIRED", "Please sign in again.");
  }
  return { ...issued, userId: current.userId };
}

/**
 * Revokes a single session by its raw token. Safe to call with a stale token.
 */
export async function revokeSessionByToken(rawToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: "logout" },
  });
}

/**
 * Revokes every live session for a user (sign out everywhere, password reset).
 */
export async function revokeAllSessions(
  userId: string,
  reason: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
  return result.count;
}

/**
 * Confirms a session id is still live. Used by requireAuth so that a revoked
 * session cannot keep working until its access token happens to expire.
 */
export async function isSessionLive(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { revokedAt: true, expiresAt: true },
  });
  if (!session) return false;
  return session.revokedAt === null && session.expiresAt.getTime() > Date.now();
}

/**
 * Deletes expired and long-revoked sessions. Run on a schedule.
 *
 * Revoked rows are kept for a week so reuse detection still has something to
 * match against shortly after a rotation.
 */
export async function pruneSessions(): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: weekAgo } },
        { revokedAt: { lt: weekAgo } },
      ],
    },
  });
  return result.count;
}
