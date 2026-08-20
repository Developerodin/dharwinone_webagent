/**
 * Email normalization.
 *
 * Two distinct notions, deliberately kept apart:
 *
 *  - `normalizeEmail`  — what we store and send to. Trimmed and lowercased.
 *  - `dedupeKey`       — what we compare for "is this the same person?".
 *                        Also folds Gmail dots and +tags.
 *
 * We store the address as typed (modulo case) because that is what the user
 * expects to see, but we must not let `a.b+x@gmail.com` and `ab@gmail.com`
 * create two accounts that both receive mail at the same inbox.
 */

/** Domains that treat dots as insignificant and support +tag addressing. */
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Trims and lowercases an email for storage and delivery.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Returns the identity key used to detect duplicate accounts.
 *
 * Gmail ignores dots in the local part and everything after a `+`, so all of
 * these reach one inbox and must map to one account.
 */
export function dedupeKey(raw: string): string {
  const normalized = normalizeEmail(raw);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return normalized;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  if (!GMAIL_DOMAINS.has(domain)) return normalized;

  const withoutTag = local.split("+")[0] ?? local;
  const withoutDots = withoutTag.replace(/\./g, "");
  // An address that is *only* dots/tags would collapse to empty; keep the
  // original local part rather than producing a key that collides with itself.
  const localKey = withoutDots || withoutTag || local;

  return `${localKey}@${domain}`;
}

/**
 * Masks an address for display: `alexander@gmail.com` -> `a•••••••r@gmail.com`.
 *
 * Used on the verification screen so the user can confirm they typed the right
 * address without us echoing a full address back onto a shared screen.
 */
export function maskEmail(raw: string): string {
  const normalized = normalizeEmail(raw);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return normalized;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at);

  if (local.length <= 2) return `${local[0] ?? ""}•${domain}`;

  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${"•".repeat(Math.min(local.length - 2, 8))}${last}${domain}`;
}
