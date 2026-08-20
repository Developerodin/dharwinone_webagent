import { authEnv } from "../config/env.js";
import { prisma } from "../db/client.js";
import type { OnboardingProfile, User } from "../generated/prisma/client.js";
import { dedupeKey, normalizeEmail } from "./email.js";
import { unauthorized } from "../lib/httpError.js";
import { verifyPassword } from "./passwords.js";

/**
 * User lookup, serialization, and login-attempt accounting.
 */

/** Shape returned to the client. Never includes hashes or counters. */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  /** Drives the "add a password" prompt for Google-only accounts. */
  hasPassword: boolean;
  providers: Array<"password" | "google">;
  onboarding: {
    complete: boolean;
    currentStep: number;
    themePref: string | null;
    fullName: string | null;
    role: string | null;
    companySize: string | null;
  };
};

type UserWithRelations = User & {
  onboarding?: OnboardingProfile | null;
  oauthAccounts?: Array<{ provider: string }>;
};

/** Include clause for every query that will be serialized to the client. */
export const authUserInclude = {
  onboarding: true,
  oauthAccounts: { select: { provider: true } },
} as const;

/**
 * Serializes a user for the client.
 */
export function toAuthUser(user: UserWithRelations): AuthUser {
  const providers: Array<"password" | "google"> = [];
  if (user.passwordHash) providers.push("password");
  if (user.oauthAccounts?.some((account) => account.provider === "google")) {
    providers.push("google");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    providers,
    onboarding: {
      complete: user.onboarding?.completedAt != null,
      currentStep: user.onboarding?.currentStep ?? 1,
      themePref: user.onboarding?.themePref ?? null,
      fullName: user.onboarding?.fullName ?? null,
      role: user.onboarding?.role ?? null,
      companySize: user.onboarding?.companySize ?? null,
    },
  };
}

/**
 * Finds a user by any spelling of their email address.
 *
 * Looks up by `emailKey`, so `A.User+tag@Gmail.com` resolves to the account
 * registered as `auser@gmail.com`.
 */
export async function findUserByEmail(
  rawEmail: string,
): Promise<(User & { onboarding: OnboardingProfile | null; oauthAccounts: Array<{ provider: string }> }) | null> {
  return prisma.user.findUnique({
    where: { emailKey: dedupeKey(rawEmail) },
    include: authUserInclude,
  });
}

/**
 * Loads a user by id with everything needed for serialization.
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: authUserInclude,
  });
}

/**
 * Builds the create-data for a new user, applying email normalization.
 */
export function newUserData(rawEmail: string) {
  return {
    email: normalizeEmail(rawEmail),
    emailKey: dedupeKey(rawEmail),
  };
}

/**
 * Throws if the account is currently locked out.
 */
export function assertNotLocked(user: User): void {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const retryAfterSec = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 1000,
    );
    throw unauthorized(
      "ACCOUNT_LOCKED",
      "Too many failed attempts. Please try again shortly.",
      { retryAfterSec },
    );
  }
}

/**
 * Records a failed password attempt, locking the account at the threshold.
 *
 * Returning a distinct ACCOUNT_LOCKED code (rather than another
 * INVALID_CREDENTIALS) matters: a user who has simply mistyped will otherwise
 * reset a password they already knew.
 */
export async function recordFailedLogin(user: User): Promise<void> {
  const env = authEnv();
  const nextCount = user.failedLoginCount + 1;
  const shouldLock = nextCount >= env.loginMaxAttempts;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: shouldLock ? 0 : nextCount,
      lockedUntil: shouldLock
        ? new Date(Date.now() + env.loginLockoutMinutes * 60 * 1000)
        : user.lockedUntil,
    },
  });
}

/**
 * Clears failure counters after a successful authentication.
 */
export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

/**
 * Verifies a password for a user that may not have one.
 *
 * Google-only accounts have `passwordHash === null`. Returning false (rather
 * than short-circuiting) keeps the caller's timing uniform.
 */
export async function checkPassword(
  user: User,
  plain: string,
): Promise<boolean> {
  if (!user.passwordHash) return false;
  return verifyPassword(user.passwordHash, plain);
}

/**
 * Ensures an onboarding row exists for a user.
 */
export async function ensureOnboarding(
  userId: string,
  seedName?: string | null,
): Promise<OnboardingProfile> {
  return prisma.onboardingProfile.upsert({
    where: { userId },
    create: { userId, fullName: seedName ?? null },
    update: {},
  });
}
