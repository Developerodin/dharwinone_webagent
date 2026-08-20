import type { Request, Response } from "express";
import { authEnv } from "../config/env.js";
import { setRefreshCookie } from "./cookies.js";
import { createSession } from "./sessions.js";
import { signAccessToken } from "./tokens.js";
import { toAuthUser, type AuthUser } from "./users.js";
import type { OnboardingProfile, User } from "../generated/prisma/client.js";

/**
 * Shared HTTP helpers for the auth routes.
 */

type SerializableUser = User & {
  onboarding: OnboardingProfile | null;
  oauthAccounts: Array<{ provider: string }>;
};

/**
 * Reads the client IP, honouring the proxy header.
 *
 * Only meaningful when `app.set("trust proxy", …)` matches the deployment: an
 * untrusted X-Forwarded-For is attacker-controlled and would let anyone evade
 * per-IP rate limits by rotating the header.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || "unknown";
}

/**
 * Reads a truncated user agent for session display.
 */
export function clientUserAgent(req: Request): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 400) : null;
}

export type AuthSuccessPayload = {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
};

/**
 * Starts a session, sets the refresh cookie, and returns the access payload.
 *
 * The single place a session is minted, so cookie attributes and token claims
 * cannot drift between login, signup, Google, and password reset.
 */
export async function issueSession(
  req: Request,
  res: Response,
  user: SerializableUser,
): Promise<AuthSuccessPayload> {
  const env = authEnv();
  const { session, token } = await createSession(user.id, {
    userAgent: clientUserAgent(req),
    ip: clientIp(req),
  });

  setRefreshCookie(res, token, session.expiresAt);

  const authUser = toAuthUser(user);
  const accessToken = signAccessToken({
    sub: user.id,
    sid: session.id,
    email: user.email,
    ev: authUser.emailVerified,
    ob: authUser.onboarding.complete,
  });

  return { accessToken, expiresIn: env.accessTtlSeconds, user: authUser };
}

/**
 * Delays until at least `floorMs` has elapsed since `startedAt`.
 *
 * Equalises response time on endpoints whose work differs by whether an account
 * exists, so latency cannot be used to enumerate registered addresses.
 */
export async function padTiming(
  startedAt: number,
  floorMs = 250,
): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= floorMs) return;
  await new Promise((resolve) => setTimeout(resolve, floorMs - elapsed));
}
