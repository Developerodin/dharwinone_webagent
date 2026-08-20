/**
 * Validated environment access.
 *
 * Auth secrets are checked once at boot rather than at first use, so a
 * misconfigured deploy fails immediately instead of at a user's first login.
 */

/** Minimum entropy we accept for an HMAC signing secret. */
const MIN_SECRET_LENGTH = 32;

/**
 * Reads a required environment variable, throwing when absent.
 */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[env] ${name} is required but not set.`);
  }
  return value;
}

/**
 * Reads a required secret, enforcing a minimum length.
 */
function requiredSecret(name: string): string {
  const value = required(name);
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[env] ${name} must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 48`,
    );
  }
  return value;
}

/**
 * Reads an integer environment variable with a default.
 */
function int(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[env] ${name} must be an integer, got "${raw}".`);
  }
  return parsed;
}

export type AuthEnv = {
  isProduction: boolean;
  databaseUrl: string;
  accessSecret: string;
  resetSecret: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  appUrl: string;
  cookieDomain: string | undefined;
  googleClientId: string | undefined;
  otpTtlMinutes: number;
  otpMaxAttempts: number;
  otpResendCooldownSec: number;
  otpMaxPerHour: number;
  loginMaxAttempts: number;
  loginLockoutMinutes: number;
  signupInviteCode: string | undefined;
};

let cached: AuthEnv | null = null;

/**
 * Loads and validates auth configuration. Memoized after the first call.
 *
 * Throws on the first misconfiguration found so that `npm start` fails loudly
 * rather than serving a half-configured auth system.
 */
export function authEnv(): AuthEnv {
  if (cached) return cached;

  const accessSecret = requiredSecret("JWT_ACCESS_SECRET");
  const resetSecret = requiredSecret("JWT_RESET_SECRET");

  if (accessSecret === resetSecret) {
    throw new Error(
      "[env] JWT_ACCESS_SECRET and JWT_RESET_SECRET must be different values. " +
        "Sharing one secret lets a password-reset ticket be replayed as an access token.",
    );
  }

  cached = {
    isProduction: process.env.NODE_ENV === "production",
    databaseUrl: required("DATABASE_URL"),
    accessSecret,
    resetSecret,
    accessTtlSeconds: int("ACCESS_TOKEN_TTL_SECONDS", 15 * 60),
    refreshTtlDays: int("REFRESH_TOKEN_TTL_DAYS", 30),
    appUrl: process.env.APP_URL?.trim() || "http://localhost:5173",
    cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || undefined,
    otpTtlMinutes: int("OTP_TTL_MINUTES", 10),
    otpMaxAttempts: int("OTP_MAX_ATTEMPTS", 5),
    otpResendCooldownSec: int("OTP_RESEND_COOLDOWN_SEC", 60),
    otpMaxPerHour: int("OTP_MAX_PER_HOUR", 5),
    loginMaxAttempts: int("LOGIN_MAX_ATTEMPTS", 10),
    loginLockoutMinutes: int("LOGIN_LOCKOUT_MINUTES", 15),
    signupInviteCode: process.env.SIGNUP_INVITE_CODE?.trim() || undefined,
  };

  return cached;
}

/**
 * Clears the memoized env. Test-only.
 */
export function resetAuthEnvCache(): void {
  cached = null;
}
