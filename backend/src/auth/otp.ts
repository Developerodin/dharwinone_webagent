import { randomInt, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { authEnv } from "../config/env.js";
import { prisma } from "../db/client.js";
import { badRequest, rateLimited } from "../lib/httpError.js";

/**
 * One-time codes for email verification and password reset.
 *
 * Codes are hashed at rest with the same primitive as passwords: six digits is
 * only ~20 bits, so a leaked table of plaintext codes would be trivially
 * reversible, and a fast hash would be brute-forced offline in seconds.
 */

export type OtpPurpose = "verify_email" | "reset_password";

/** argon2 parameters for OTP codes — lighter than passwords, still not fast. */
const OTP_ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

/**
 * Generates a cryptographically random six-digit code.
 *
 * `randomInt` is uniform over the range; `Math.random()` would be both
 * predictable and biased.
 */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export type IssuedOtp = {
  code: string;
  expiresAt: Date;
};

/**
 * Issues a fresh code, invalidating any outstanding code for the same purpose.
 *
 * Enforces both a resend cooldown and an hourly cap so that the endpoint cannot
 * be used to flood someone's inbox.
 */
export async function issueOtp(
  userId: string,
  purpose: OtpPurpose,
): Promise<IssuedOtp> {
  const env = authEnv();
  const now = Date.now();

  const recent = await prisma.otpCode.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recent) {
    const sinceLast = now - recent.createdAt.getTime();
    const cooldownMs = env.otpResendCooldownSec * 1000;
    if (sinceLast < cooldownMs) {
      throw rateLimited(
        "Please wait before requesting another code.",
        Math.ceil((cooldownMs - sinceLast) / 1000),
      );
    }
  }

  const hourAgo = new Date(now - 60 * 60 * 1000);
  const sentThisHour = await prisma.otpCode.count({
    where: { userId, purpose, createdAt: { gte: hourAgo } },
  });

  if (sentThisHour >= env.otpMaxPerHour) {
    throw rateLimited(
      "Too many codes requested. Please try again later.",
      60 * 60,
    );
  }

  const code = generateCode();
  const expiresAt = new Date(now + env.otpTtlMinutes * 60 * 1000);
  const codeHash = await hash(code, OTP_ARGON2);

  await prisma.$transaction([
    // Exactly one code may be live per purpose: issuing a new one retires the
    // old, so an intercepted earlier code stops working the moment we resend.
    prisma.otpCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash,
        maxAttempts: env.otpMaxAttempts,
        expiresAt,
      },
    }),
  ]);

  // Local development only. Verifying a signup otherwise means opening a real
  // inbox, which makes the flow tedious to test and impossible to script.
  // Guarded on NODE_ENV so a production build can never print a live code.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[otp] ${purpose} code for user ${userId}: ${code}`);
  }

  return { code, expiresAt };
}

/**
 * Verifies a submitted code and consumes it on success.
 *
 * The attempt counter is incremented *before* the comparison, so abandoning the
 * request mid-flight cannot be used to get unlimited free guesses.
 */
export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  submitted: string,
): Promise<void> {
  const record = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw badRequest("OTP_INVALID", "That code is not valid. Request a new one.");
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw badRequest("OTP_EXPIRED", "That code has expired. Request a new one.");
  }

  if (record.attempts >= record.maxAttempts) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw badRequest(
      "OTP_MAX_ATTEMPTS",
      "Too many incorrect attempts. Request a new code.",
    );
  }

  const updated = await prisma.otpCode.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true, maxAttempts: true, codeHash: true },
  });

  const matches = await verify(updated.codeHash, submitted, OTP_ARGON2).catch(
    () => false,
  );

  if (!matches) {
    const remaining = Math.max(updated.maxAttempts - updated.attempts, 0);
    if (remaining === 0) {
      await prisma.otpCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw badRequest(
        "OTP_MAX_ATTEMPTS",
        "Too many incorrect attempts. Request a new code.",
      );
    }
    throw badRequest("OTP_INVALID", "That code is not correct.", {
      attemptsRemaining: remaining,
    });
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

/**
 * Compares two six-digit strings in constant time.
 *
 * Exported for tests and for any future path that compares codes directly
 * rather than through argon2.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Deletes expired and consumed codes. Run on a schedule.
 */
export async function pruneOtpCodes(): Promise<number> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.otpCode.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: dayAgo } }, { consumedAt: { lt: dayAgo } }],
    },
  });
  return result.count;
}
