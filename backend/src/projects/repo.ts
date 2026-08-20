import { LIMITS } from "../config/limits.js";
import { prisma } from "../db/client.js";
import type {
  Prisma,
  ProjectVersion,
  VersionSource,
} from "../generated/prisma/client.js";
import { badRequest, conflict, notFound } from "../lib/httpError.js";
import { linkPageAssets } from "../assets/links.js";
import {
  extractAssetPaths,
  resolveProjectName,
  validatePage,
} from "./pageGuards.js";
import {
  projectDetailSelect,
  projectSummarySelect,
  versionSummarySelect,
  type ProjectDetail,
  type ProjectSummary,
  type VersionSummary,
} from "./select.js";
import { nextAvailableSlug, slugify } from "./slug.js";

/**
 * The only module permitted to query the project tables.
 *
 * Every function takes a `userId` and applies `scope()`. Route-level ownership
 * checks get forgotten when someone adds an endpoint in a hurry; a repository
 * that cannot express an unscoped query does not have that failure mode.
 */

/**
 * Ownership predicate.
 *
 * Matches projects the user owns or has been added to as a member, and never
 * matches soft-deleted rows — trashed projects are reachable only through the
 * explicit trash listing.
 */
function scope(userId: string): Prisma.ProjectWhereInput {
  return {
    deletedAt: null,
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

/**
 * Loads a project the caller may access, or throws.
 *
 * Returns 404 rather than 403 for someone else's project: a 403 confirms the
 * id exists, which is the fact being withheld.
 */
export async function requireProject(
  userId: string,
  projectId: string,
): Promise<ProjectDetail> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...scope(userId) },
    select: projectDetailSelect,
  });

  if (!project) {
    throw notFound("PROJECT_NOT_FOUND", "That project could not be found.");
  }

  return project;
}

export type ListProjectsArgs = {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  query?: string;
  limit?: number;
  /** Opaque keyset cursor from a previous page. */
  cursor?: string | null;
  /** List the trash instead of live projects. */
  trashed?: boolean;
};

export type ListProjectsResult = {
  projects: ProjectSummary[];
  nextCursor: string | null;
};

/**
 * Encodes a keyset cursor.
 *
 * Keyset rather than OFFSET: offset pagination re-scans every skipped row, so
 * page 20 of a heavy user's project list gets measurably slower than page 1.
 */
export function encodeCursor(updatedAt: Date, id: string): string {
  return Buffer.from(`${updatedAt.toISOString()}|${id}`).toString("base64url");
}

/**
 * Decodes a keyset cursor, ignoring anything malformed.
 */
export function decodeCursor(
  cursor: string | null | undefined,
): { updatedAt: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const [iso, id] = Buffer.from(cursor, "base64url").toString().split("|");
    if (!iso || !id) return null;
    const updatedAt = new Date(iso);
    return Number.isNaN(updatedAt.getTime()) ? null : { updatedAt, id };
  } catch {
    return null;
  }
}

/**
 * Lists a user's projects, newest activity first.
 */
export async function listProjects(
  userId: string,
  args: ListProjectsArgs = {},
): Promise<ListProjectsResult> {
  const limit = Math.min(
    Math.max(args.limit ?? LIMITS.defaultPageSize, 1),
    LIMITS.maxPageSize,
  );

  const base: Prisma.ProjectWhereInput = args.trashed
    ? {
        deletedAt: { not: null },
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      }
    : scope(userId);

  const cursor = decodeCursor(args.cursor);

  // Built as AND clauses rather than a merged object: the ownership predicate
  // and the keyset cursor both use OR, and spreading them together would
  // silently drop one of them — taking the ownership check with it.
  const where: Prisma.ProjectWhereInput = {
    AND: [
      base,
      ...(args.status ? [{ status: args.status }] : []),
      ...(args.query
        ? [{ name: { contains: args.query, mode: "insensitive" as const } }]
        : []),
      ...(cursor
        ? [
            {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
              ],
            },
          ]
        : []),
    ],
  };

  // One extra row tells us whether another page exists without a second query.
  const rows = await prisma.project.findMany({
    where,
    select: projectSummarySelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const projects = hasMore ? rows.slice(0, limit) : rows;
  const last = projects[projects.length - 1];

  return {
    projects,
    nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last.id) : null,
  };
}

/**
 * Reserves a slug that does not collide with the owner's existing projects.
 */
async function reserveSlug(ownerId: string, name: string): Promise<string> {
  const base = slugify(name);

  const existing = await prisma.project.findMany({
    where: { ownerId, slug: { startsWith: base } },
    select: { slug: true },
  });

  return nextAvailableSlug(base, new Set(existing.map((row) => row.slug)));
}

/**
 * Enforces the per-user project quota.
 */
async function assertProjectQuota(ownerId: string): Promise<void> {
  const used = await prisma.project.count({
    where: { ownerId, deletedAt: null },
  });

  if (used >= LIMITS.maxProjectsPerUser) {
    throw badRequest(
      "QUOTA_EXCEEDED",
      "You've reached your project limit. Delete one to make room.",
      { limit: LIMITS.maxProjectsPerUser, used },
    );
  }
}

export type CreateProjectArgs = {
  name?: string;
  pageFamily?: string;
};

/**
 * Creates an empty draft project at version 0.
 *
 * Version 0 means "no document yet" — the first build appends version 1. That
 * keeps `currentVersion` honest as a count of stored documents rather than
 * requiring an empty placeholder version nobody can revert to.
 */
export async function createProject(
  userId: string,
  args: CreateProjectArgs = {},
): Promise<ProjectDetail> {
  await assertProjectQuota(userId);

  const name = args.name?.trim() || "Untitled project";
  const slug = await reserveSlug(userId, name);

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
      slug,
      pageFamily: args.pageFamily ?? "premium",
      events: { create: { userId, type: "created" } },
    },
    select: projectDetailSelect,
  });

  return project;
}

export type AppendVersionArgs = {
  page: unknown;
  brief?: unknown;
  direction?: unknown;
  pageFamily: string;
  source: VersionSource;
  summary: string;
  instruction?: string | null;
  /**
   * The version the client believes is current. Omit only for the very first
   * write of a project, where there is nothing to conflict with.
   */
  expectedVersion?: number;
};

export type AppendVersionResult = {
  version: ProjectVersion;
  project: ProjectDetail;
};

/**
 * Appends an immutable version and moves the project's head pointer.
 *
 * Concurrency is handled by compare-and-swap: the pointer update is
 * conditional on the `currentVersion` we read, so a writer that slipped in
 * between our read and write causes zero rows to update and we report a
 * conflict instead of silently overwriting their work. The unique constraint
 * on (projectId, version) is the database-level backstop for the same race.
 */
export async function appendVersion(
  userId: string,
  projectId: string,
  args: AppendVersionArgs,
): Promise<AppendVersionResult> {
  const { page, sizeBytes } = validatePage(args.page);
  const assetPaths = extractAssetPaths(page);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, ...scope(userId) },
      select: { id: true, currentVersion: true, currentVersionId: true, ownerId: true },
    });

    if (!project) {
      throw notFound("PROJECT_NOT_FOUND", "That project could not be found.");
    }

    if (
      args.expectedVersion !== undefined &&
      args.expectedVersion !== project.currentVersion
    ) {
      throw conflict(
        "VERSION_CONFLICT",
        "This project was changed somewhere else.",
        {
          currentVersion: project.currentVersion,
          yourVersion: args.expectedVersion,
        },
      );
    }

    const nextVersion = project.currentVersion + 1;

    const created = await tx.projectVersion.create({
      data: {
        projectId,
        version: nextVersion,
        page: page as Prisma.InputJsonValue,
        brief: (args.brief ?? undefined) as Prisma.InputJsonValue | undefined,
        direction: (args.direction ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        pageFamily: args.pageFamily,
        source: args.source,
        summary: args.summary.slice(0, 280),
        instruction: args.instruction ?? null,
        authorId: userId,
        parentVersionId: project.currentVersionId,
        sizeBytes,
      },
    });

    const moved = await tx.project.updateMany({
      where: { id: projectId, currentVersion: project.currentVersion },
      data: {
        currentVersionId: created.id,
        currentVersion: nextVersion,
        pageFamily: args.pageFamily,
        ...(args.brief !== undefined
          ? { brief: args.brief as Prisma.InputJsonValue }
          : {}),
        ...(args.direction !== undefined
          ? { direction: args.direction as Prisma.InputJsonValue }
          : {}),
        name: resolveProjectName(args.brief, page),
      },
    });

    if (moved.count === 0) {
      throw conflict(
        "VERSION_CONFLICT",
        "This project was changed somewhere else.",
        { currentVersion: project.currentVersion },
      );
    }

    await linkPageAssets(tx, projectId, project.ownerId, assetPaths);

    await tx.projectEvent.create({
      data: {
        projectId,
        userId,
        type: args.source === "REVERT" ? "reverted" : "edited",
        meta: { version: nextVersion, source: args.source },
      },
    });

    const refreshed = await tx.project.findUniqueOrThrow({
      where: { id: projectId },
      select: projectDetailSelect,
    });

    return { version: created, project: refreshed };
  });
}

/**
 * Loads the current document for a project.
 */
export async function getHeadVersion(
  userId: string,
  projectId: string,
): Promise<ProjectVersion | null> {
  const project = await requireProject(userId, projectId);
  if (!project.currentVersionId) return null;

  return prisma.projectVersion.findUnique({
    where: { id: project.currentVersionId },
  });
}

/**
 * Loads one historical version.
 */
export async function getVersion(
  userId: string,
  projectId: string,
  version: number,
): Promise<ProjectVersion> {
  await requireProject(userId, projectId);

  const found = await prisma.projectVersion.findUnique({
    where: { projectId_version: { projectId, version } },
  });

  if (!found) {
    throw notFound("VERSION_NOT_FOUND", "That version could not be found.");
  }

  return found;
}

/**
 * Lists version history, newest first, without the page documents.
 */
export async function listVersions(
  userId: string,
  projectId: string,
  limit = 50,
  before?: number,
): Promise<VersionSummary[]> {
  await requireProject(userId, projectId);

  return prisma.projectVersion.findMany({
    where: {
      projectId,
      ...(before !== undefined ? { version: { lt: before } } : {}),
    },
    select: versionSummarySelect,
    orderBy: { version: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

/**
 * Reverts to an earlier version by appending its content as a new version.
 *
 * Nothing is deleted. Reverting from v9 to v4 produces v10 carrying v4's
 * document, so "redo" is simply reverting to v9 — which is what a user expects
 * from an editor and is impossible to get wrong.
 */
export async function revertToVersion(
  userId: string,
  projectId: string,
  targetVersion: number,
  expectedVersion?: number,
): Promise<AppendVersionResult> {
  const target = await getVersion(userId, projectId, targetVersion);

  return appendVersion(userId, projectId, {
    page: target.page,
    brief: target.brief ?? undefined,
    direction: target.direction ?? undefined,
    pageFamily: target.pageFamily,
    source: "REVERT",
    summary: `Reverted to version ${targetVersion}`,
    expectedVersion,
  });
}

/**
 * Renames a project, resolving slug collisions rather than failing.
 */
export async function renameProject(
  userId: string,
  projectId: string,
  name: string,
): Promise<ProjectDetail> {
  const project = await requireProject(userId, projectId);
  const trimmed = name.trim().slice(0, 120) || "Untitled project";
  const slug = await reserveSlug(project.ownerId, trimmed);

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: trimmed,
      slug,
      events: { create: { userId, type: "renamed", meta: { name: trimmed } } },
    },
    select: projectDetailSelect,
  });

  return updated;
}

/**
 * Moves a project to the trash.
 *
 * Soft delete with a purge date: "I deleted the wrong project" should be
 * answerable with one UPDATE, not a database restore.
 */
export async function softDeleteProject(
  userId: string,
  projectId: string,
): Promise<{ purgeAfter: Date }> {
  await requireProject(userId, projectId);

  const purgeAfter = new Date(
    Date.now() + LIMITS.trashRetentionDays * 24 * 60 * 60 * 1000,
  );

  await prisma.project.update({
    where: { id: projectId },
    data: {
      deletedAt: new Date(),
      purgeAfter,
      events: { create: { userId, type: "deleted" } },
    },
  });

  return { purgeAfter };
}

/**
 * Restores a project from the trash.
 */
export async function restoreProject(
  userId: string,
  projectId: string,
): Promise<ProjectDetail> {
  const trashed = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: { not: null },
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true, ownerId: true },
  });

  if (!trashed) {
    throw notFound("PROJECT_NOT_FOUND", "That project could not be found.");
  }

  await assertProjectQuota(trashed.ownerId);

  return prisma.project.update({
    where: { id: projectId },
    data: {
      deletedAt: null,
      purgeAfter: null,
      events: { create: { userId, type: "restored" } },
    },
    select: projectDetailSelect,
  });
}

/**
 * Copies a project's current document into a new project.
 */
export async function duplicateProject(
  userId: string,
  projectId: string,
): Promise<ProjectDetail> {
  const source = await requireProject(userId, projectId);
  await assertProjectQuota(userId);

  const head = source.currentVersionId
    ? await prisma.projectVersion.findUnique({
        where: { id: source.currentVersionId },
      })
    : null;

  const name = `${source.name} copy`;
  const slug = await reserveSlug(userId, name);

  const created = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
      slug,
      pageFamily: source.pageFamily,
      brief: (source.brief ?? undefined) as Prisma.InputJsonValue | undefined,
      direction: (source.direction ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      enrichedChatText: source.enrichedChatText,
      events: {
        create: { userId, type: "duplicated", meta: { from: projectId } },
      },
    },
    select: projectDetailSelect,
  });

  if (!head) return created;

  const { project } = await appendVersion(userId, created.id, {
    page: head.page,
    brief: head.brief ?? undefined,
    direction: head.direction ?? undefined,
    pageFamily: head.pageFamily,
    source: "DUPLICATE",
    summary: `Duplicated from ${source.name}`,
    expectedVersion: 0,
  });

  return project;
}

/**
 * Records that a project was opened. Fire-and-forget from the route.
 */
export async function touchLastOpened(
  userId: string,
  projectId: string,
): Promise<void> {
  await prisma.project.updateMany({
    where: { id: projectId, ...scope(userId) },
    data: { lastOpenedAt: new Date() },
  });
}
