import { hash, verify } from "@node-rs/argon2";
import { badRequest } from "../lib/httpError.js";

/**
 * Password hashing and policy.
 *
 * argon2id at OWASP's documented minimum: 19 MiB memory, t=2, p=1.
 *
 * Measured at ~7ms/verify on an M-series laptop and expected in the
 * 20-40ms range on a small cloud vCPU. That is deliberately not tuned up to
 * the ~100ms figure often quoted, because with argon2 the cost that actually
 * matters to an attacker is *memory*, and memory is also what constrains us:
 * each in-flight verify holds 19 MiB, so ten concurrent logins is ~190 MB.
 * Raising memoryCost to 46 MiB would put the same ten logins at ~460 MB and
 * OOM a small instance long before it inconveniences anyone with a GPU farm.
 *
 * If this moves, re-measure under concurrency, not in isolation.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Minimum length. Length beats composition rules for real-world strength. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Upper bound. argon2 has no practical input limit, but accepting megabyte
 * passwords is a free CPU-exhaustion vector.
 */
export const MAX_PASSWORD_LENGTH = 200;

/**
 * The passwords attackers try first.
 *
 * Deliberately short and high-value rather than an exhaustive list: it blocks
 * the credential-stuffing head without frustrating people who chose a decent
 * passphrase. Extend from a leaked-password corpus if abuse shows up.
 */
const COMMON_PASSWORDS = new Set([
  "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234",
  "111111", "1234567", "dragon", "123123", "baseball", "abc123", "football",
  "monkey", "letmein", "shadow", "master", "696969", "mustang", "666666",
  "qwertyuiop", "123321", "1234567890", "superman", "asdfghjkl", "trustno1",
  "hello", "charlie", "robert", "thomas", "hockey", "ranger", "daniel",
  "starwars", "klaster", "112233", "george", "computer", "michelle", "jessica",
  "pepper", "1111", "zxcvbn", "555555", "11111111", "131313", "freedom",
  "777777", "pass", "maggie", "159753", "aaaaaa", "ginger", "princess",
  "joshua", "cheese", "amanda", "summer", "love", "ashley", "nicole",
  "chelsea", "biteme", "matthew", "access", "yankees", "987654321", "dallas",
  "austin", "thunder", "taylor", "matrix", "mobilemail", "mom", "monitor",
  "monitoring", "montana", "moon", "moscow", "password1", "password123",
  "passw0rd", "p@ssword", "p@ssw0rd", "admin", "administrator", "welcome",
  "welcome1", "login", "guest", "test", "test123", "changeme", "secret",
  "iloveyou", "sunshine", "qwerty123", "letmein1", "abcd1234", "a1b2c3d4",
  "1q2w3e4r", "1qaz2wsx", "zaq12wsx", "qazwsx", "asdfgh", "qwe123",
  "google", "facebook", "whatever", "internet", "service", "samsung",
  "michael", "jordan", "harley", "buster", "soccer", "tigger", "purple",
]);

/**
 * Hashes a plaintext password with argon2id.
 */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Verifies a password against a stored hash. Never throws on a bad match.
 */
export async function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plain, ARGON2_OPTIONS);
  } catch {
    // A malformed or truncated hash must read as "wrong password", not a 500.
    return false;
  }
}

/**
 * A precomputed hash of a random string, used to equalise timing.
 *
 * Generated lazily on first use so that module import stays cheap.
 */
let dummyHash: string | null = null;

/**
 * Burns the same CPU as a real verify when the account does not exist.
 *
 * Without this, "no such user" returns in microseconds while a real user's
 * wrong password takes ~100ms — a timing oracle that enumerates accounts.
 */
export async function fakeVerifyPassword(): Promise<false> {
  dummyHash ??= await hashPassword(
    "timing-equaliser-not-a-real-password-000000",
  );
  await verifyPassword(dummyHash, "definitely-not-the-password");
  return false;
}

/**
 * Validates a password against policy, throwing HttpError on failure.
 *
 * Policy is length-first with a common-password blocklist. There are
 * deliberately no symbol/uppercase requirements: they measurably push users
 * toward predictable mutations like `Password1!` without adding entropy.
 */
export function assertPasswordPolicy(plain: string, email?: string): void {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(
      "WEAK_PASSWORD",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      { reason: "too_short", minLength: MIN_PASSWORD_LENGTH },
    );
  }

  if (plain.length > MAX_PASSWORD_LENGTH) {
    throw badRequest(
      "WEAK_PASSWORD",
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      { reason: "too_long", maxLength: MAX_PASSWORD_LENGTH },
    );
  }

  const lowered = plain.toLowerCase();

  if (COMMON_PASSWORDS.has(lowered)) {
    throw badRequest(
      "WEAK_PASSWORD",
      "That password is one of the most commonly used — please pick another.",
      { reason: "common" },
    );
  }

  // A password that is just the email (or its local part) is trivially guessed
  // by anyone who knows the address, which is everyone who has ever been CC'd.
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const localPart = normalizedEmail.split("@")[0] ?? "";
    if (
      lowered === normalizedEmail ||
      (localPart.length >= 4 && lowered === localPart)
    ) {
      throw badRequest(
        "WEAK_PASSWORD",
        "Password cannot be your email address.",
        { reason: "email_derived" },
      );
    }
  }

  // A single repeated character is long but has almost no entropy.
  if (/^(.)\1+$/.test(plain)) {
    throw badRequest(
      "WEAK_PASSWORD",
      "Password cannot be a single repeated character.",
      { reason: "repeated_character" },
    );
  }
}
