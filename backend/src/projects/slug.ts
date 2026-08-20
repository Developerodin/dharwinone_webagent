/**
 * Project slugs.
 */

/** Slugs are unique per owner, so short is fine. */
const MAX_SLUG_LENGTH = 60;

/**
 * Converts a display name into a URL-safe slug.
 *
 * Returns "project" for input that reduces to nothing — a name written
 * entirely in a script we do not transliterate must still produce a usable
 * slug rather than an empty string that collides with every other one.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    // Strip combining marks so "Café" becomes "cafe" rather than "caf".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "project";
}

/**
 * Finds the first free slug for an owner, appending -2, -3, … on collision.
 *
 * `taken` is the set of existing slugs that share this base. Renaming must
 * never fail with a conflict: a user changing a project's name does not care
 * about slug mechanics, so we resolve it and report the slug we actually used.
 */
export function nextAvailableSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;

  for (let suffix = 2; suffix < 1000; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Practically unreachable; a random tail is still better than throwing.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
