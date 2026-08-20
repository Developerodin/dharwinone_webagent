import { LIMITS } from "../config/limits.js";
import { prisma } from "../db/client.js";

/**
 * Scheduled cleanup for the project tables.
 *
 * Each function is batched and returns a count so the caller can log what
 * happened — a sweep that silently removes far more than expected is exactly
 * the thing worth alerting on.
 */

/**
 * Permanently removes projects whose trash window has elapsed.
 *
 * Cascades handle versions, messages, events and asset links; the orphaned
 * objects are then picked up by the asset collector on its next run.
 */
export async function purgeExpiredProjects(batchSize = 50): Promise<number> {
  const expired = await prisma.project.findMany({
    where: { deletedAt: { not: null }, purgeAfter: { lt: new Date() } },
    select: { id: true },
    take: batchSize,
  });

  if (expired.length === 0) return 0;

  const result = await prisma.project.deleteMany({
    where: { id: { in: expired.map((row) => row.id) } },
  });

  return result.count;
}

/**
 * Prunes old versions, keeping history usable but bounded.
 *
 * Retained unconditionally:
 *  - everything inside the retention window
 *  - every BUILD version (the milestones a user actually recognises)
 *  - the current head
 *
 * Everything else beyond the per-project cap is removed oldest-first. The
 * result is continuous recent history plus durable milestones, rather than an
 * arbitrary truncation that loses the version someone wanted.
 */
export async function pruneProjectVersions(
  projectId: string,
): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { currentVersionId: true },
  });

  if (!project) return 0;

  const cutoff = new Date(
    Date.now() - LIMITS.versionRetentionDays * 24 * 60 * 60 * 1000,
  );

  const total = await prisma.projectVersion.count({ where: { projectId } });
  if (total <= LIMITS.maxVersionsPerProject) return 0;

  const removable = await prisma.projectVersion.findMany({
    where: {
      projectId,
      createdAt: { lt: cutoff },
      source: { not: "BUILD" },
      ...(project.currentVersionId
        ? { id: { not: project.currentVersionId } }
        : {}),
    },
    select: { id: true },
    orderBy: { version: "asc" },
    take: total - LIMITS.maxVersionsPerProject,
  });

  if (removable.length === 0) return 0;

  const result = await prisma.projectVersion.deleteMany({
    where: { id: { in: removable.map((row) => row.id) } },
  });

  await prisma.projectEvent.create({
    data: {
      projectId,
      type: "versions_pruned",
      meta: { removed: result.count },
    },
  });

  return result.count;
}

/**
 * Finds projects over the version cap and prunes each.
 */
export async function pruneAllProjectVersions(
  batchSize = 25,
): Promise<number> {
  const candidates = await prisma.project.findMany({
    where: { currentVersion: { gt: LIMITS.maxVersionsPerProject } },
    select: { id: true },
    take: batchSize,
  });

  let removed = 0;
  for (const project of candidates) {
    removed += await pruneProjectVersions(project.id);
  }
  return removed;
}

/**
 * Trims chat history for projects over the message cap.
 */
export async function pruneChatMessages(batchSize = 25): Promise<number> {
  const noisy = await prisma.chatMessage.groupBy({
    by: ["projectId"],
    _count: { _all: true },
    having: { projectId: { _count: { gt: LIMITS.maxMessagesPerProject } } },
    // Prisma requires orderBy whenever take is used on a grouped query.
    orderBy: { _count: { projectId: "desc" } },
    take: batchSize,
  });

  let removed = 0;

  for (const group of noisy) {
    const excess = group._count._all - LIMITS.maxMessagesPerProject;
    const oldest = await prisma.chatMessage.findMany({
      where: { projectId: group.projectId },
      select: { id: true },
      orderBy: { seq: "asc" },
      take: excess,
    });

    const result = await prisma.chatMessage.deleteMany({
      where: { id: { in: oldest.map((row) => row.id) } },
    });
    removed += result.count;
  }

  return removed;
}
