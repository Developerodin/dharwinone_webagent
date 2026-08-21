import { LIMITS } from "../config/limits.js";
import { prisma } from "../db/client.js";
import { HttpError } from "../lib/httpError.js";

/**
 * Rate limits on expensive pipeline work.
 */

/** Rolling window the build quota is measured over. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Counts a user's builds in the last 24 hours.
 *
 * Stored BUILD versions are the record, so a build that failed before writing
 * anything does not count against the user — they got nothing for it.
 */
export async function buildsInLastDay(userId: string): Promise<number> {
  return prisma.projectVersion.count({
    where: {
      source: "BUILD",
      createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
      project: { ownerId: userId },
    },
  });
}

/**
 * Rejects a build once the daily quota is spent.
 *
 * Checked before the pipeline runs rather than after: the whole point is to
 * not spend the tokens, and a 429 delivered after a 40-second build would have
 * already cost what the limit exists to protect.
 */
export async function assertBuildQuota(userId: string): Promise<void> {
  const limit = LIMITS.maxBuildsPerDay;
  const used = await buildsInLastDay(userId);

  if (used >= limit) {
    throw new HttpError(
      "RATE_LIMITED",
      `You've hit today's limit of ${limit} builds. It resets as your earlier builds age out.`,
      429,
      { limit, used, windowHours: 24 },
    );
  }
}
