/**
 * Quotas and size caps.
 *
 * Collected in one module so they can be reviewed together and tuned per
 * environment without hunting through call sites.
 */

/**
 * Reads an integer environment variable with a default.
 */
function int(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const LIMITS = {
  /**
   * Hard cap on a stored page document.
   *
   * Pages reference assets by path, so a normal document is 20-80 KB. Anything
   * approaching a megabyte means something is being embedded that should be an
   * asset — see `assertNoDataUrls`.
   */
  get maxPageBytes() {
    return int("MAX_PAGE_BYTES", 1024 * 1024);
  },

  /** Projects per user. */
  get maxProjectsPerUser() {
    return int("MAX_PROJECTS_PER_USER", 50);
  },

  /** Retained versions per project before pruning non-milestones. */
  get maxVersionsPerProject() {
    return int("MAX_VERSIONS_PER_PROJECT", 500);
  },

  /** Total object-storage bytes per user. */
  get maxStorageBytesPerUser() {
    return int("MAX_STORAGE_BYTES_PER_USER", 2 * 1024 * 1024 * 1024);
  },

  /** Largest single image upload. */
  get maxImageBytes() {
    return int("MAX_IMAGE_BYTES", 25 * 1024 * 1024);
  },

  /** Largest single video upload. */
  get maxVideoBytes() {
    return int("MAX_VIDEO_BYTES", 50 * 1024 * 1024);
  },

  /**
   * Pipeline builds per user per rolling 24 hours.
   *
   * A build is the most expensive thing the API does — a full LLM pipeline —
   * so this is the cap that stops one account from spending the token budget
   * for everyone.
   */
  get maxBuildsPerDay() {
    return int("MAX_BUILDS_PER_DAY", 30);
  },

  /** Chat messages retained per project. */
  get maxMessagesPerProject() {
    return int("MAX_MESSAGES_PER_PROJECT", 2000);
  },

  /** Days a soft-deleted project stays recoverable. */
  get trashRetentionDays() {
    return int("TRASH_RETENTION_DAYS", 30);
  },

  /** Days of full version history kept before milestone-only pruning. */
  get versionRetentionDays() {
    return int("VERSION_RETENTION_DAYS", 30);
  },

  /** Default page size for cursor-paginated lists. */
  get defaultPageSize() {
    return int("DEFAULT_PAGE_SIZE", 24);
  },

  /** Maximum page size a client may request. */
  get maxPageSize() {
    return int("MAX_PAGE_SIZE", 100);
  },
} as const;
