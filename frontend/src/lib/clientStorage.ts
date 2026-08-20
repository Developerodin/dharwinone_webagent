/**
 * Client-side storage ownership.
 *
 * Every browser key this app writes is named here, in one place, so that
 * clearing state is a complete operation rather than a list someone has to
 * remember to keep up to date.
 *
 * Storage moved from being the source of truth to being a cache when projects
 * became server-owned. Anything written before that change is stale by
 * definition, and a user carrying it forward sees projects that no longer
 * reflect what the server holds. `SCHEMA_VERSION` is how that gets cleaned up
 * without asking anyone to clear their browser by hand: bump it, and the next
 * page load wipes the old shape for every user exactly once.
 */

/** Marker recording which storage layout this browser holds. */
const SCHEMA_KEY = "prowplus-storage-version";

/**
 * Current client storage layout.
 *
 * Bump this whenever the shape of anything below changes incompatibly.
 *
 *   1 — pre-accounts: localStorage was the source of truth for projects
 *   2 — server-owned projects; localStorage demoted to a cache
 */
const SCHEMA_VERSION = 2;

/** Keys holding one user's data. Cleared on sign-out and on a schema bump. */
const USER_SCOPED_KEYS = [
  "prowplus-projects",
  "prowplus-active-project",
  "prowplus-preview-payload",
  "prowplus-projects-imported",
] as const;

/** Short-lived keys tied to one flow rather than one user. */
const TRANSIENT_KEYS = [
  "prowplus-google-nonce",
  "prowplus-pending-email",
] as const;

/**
 * Removes a key from both storages, ignoring a browser that blocks access.
 *
 * Safari in private mode throws on write; a cleanup that throws would take the
 * whole app boot down with it.
 */
function forget(key: string): void {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable. Nothing to clean up, and nothing we can do.
  }
}

/**
 * Clears everything this app has stored in the browser.
 *
 * Safe to call at any time: the server holds the projects, so the worst case is
 * one extra fetch to repopulate the cache.
 */
export function clearAllClientStorage(): void {
  for (const key of [...USER_SCOPED_KEYS, ...TRANSIENT_KEYS]) {
    forget(key);
  }

  // Sweep anything namespaced that predates this list — old builds wrote keys
  // that no longer appear in the source, and they would otherwise linger
  // forever.
  try {
    const orphans = Object.keys(localStorage).filter(
      (key) => key.startsWith("prowplus-") && key !== SCHEMA_KEY,
    );
    for (const key of orphans) forget(key);
  } catch {
    // Ignore: the explicit list above is the important part.
  }
}

/**
 * Clears one user's cached data, leaving the schema marker in place.
 *
 * Called on sign-out. The project cache is one person's data, and leaving it
 * would show the next user of a shared machine the previous user's projects.
 */
export function clearUserScopedStorage(): void {
  for (const key of USER_SCOPED_KEYS) forget(key);
}

/**
 * Discards client storage written by an older layout.
 *
 * Runs once per browser per version bump, before anything reads the cache — so
 * a user upgrading from the localStorage-owned era starts from whatever the
 * server actually holds rather than from a stale local copy.
 */
export function migrateClientStorage(): void {
  let stored: string | null = null;

  try {
    stored = localStorage.getItem(SCHEMA_KEY);
  } catch {
    return;
  }

  const version = stored ? Number.parseInt(stored, 10) : 0;
  if (version === SCHEMA_VERSION) return;

  clearAllClientStorage();

  try {
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  } catch {
    // If the marker cannot be written the wipe simply repeats next load, which
    // is wasteful but not harmful.
  }
}
