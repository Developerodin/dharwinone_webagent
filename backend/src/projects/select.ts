import type { Prisma } from "../generated/prisma/client.js";

/**
 * Query shapes for the project tables.
 *
 * The summary select exists to make one mistake impossible: a list endpoint
 * that also drags every project's page JSONB across the wire. Rendering a
 * dashboard must never read a version row, so `page` is not selectable here at
 * all — it lives only on ProjectVersion.
 */
export const projectSummarySelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  pageFamily: true,
  currentVersion: true,
  currentVersionId: true,
  thumbnailAssetId: true,
  phase: true,
  createdAt: true,
  updatedAt: true,
  lastOpenedAt: true,
  deletedAt: true,
  purgeAfter: true,
} satisfies Prisma.ProjectSelect;

export type ProjectSummary = Prisma.ProjectGetPayload<{
  select: typeof projectSummarySelect;
}>;

/** Adds the small JSON columns needed when a single project is opened. */
export const projectDetailSelect = {
  ...projectSummarySelect,
  brief: true,
  direction: true,
  enrichedChatText: true,
  ownerId: true,
} satisfies Prisma.ProjectSelect;

export type ProjectDetail = Prisma.ProjectGetPayload<{
  select: typeof projectDetailSelect;
}>;

/** Version metadata for the history list — deliberately without `page`. */
export const versionSummarySelect = {
  id: true,
  version: true,
  source: true,
  summary: true,
  instruction: true,
  authorId: true,
  parentVersionId: true,
  pageFamily: true,
  sizeBytes: true,
  createdAt: true,
} satisfies Prisma.ProjectVersionSelect;

export type VersionSummary = Prisma.ProjectVersionGetPayload<{
  select: typeof versionSummarySelect;
}>;
