import { z } from "zod";

/**
 * Request bodies for /api/projects and /api/assets.
 */

/** Page families the renderer supports. */
export const pageFamilySchema = z.enum([
  "premium",
  "elegant",
  "bold",
  "minimal",
  "rustic",
  "vibrant",
]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  pageFamily: pageFamilySchema.optional(),
});

export const renameProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const listProjectsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(512).optional(),
  trashed: z.coerce.boolean().optional(),
});

export const revertSchema = z.object({
  toVersion: z.number().int().min(1),
  expectedVersion: z.number().int().min(0).optional(),
});

/**
 * A saved document.
 *
 * `page` is validated properly by pageGuards (size, schemes, schema); here it
 * only has to be an object, so that a 900 KB page produces PAGE_TOO_LARGE
 * rather than a wall of zod issues.
 */
export const saveVersionSchema = z.object({
  page: z.unknown(),
  brief: z.unknown().optional(),
  direction: z.unknown().optional(),
  pageFamily: pageFamilySchema,
  summary: z.string().trim().min(1).max(280).optional(),
  instruction: z.string().trim().max(4000).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

export const presignAssetSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(3).max(120),
  bytes: z.number().int().positive(),
  sha256: z.string().trim().length(64),
});

export const commitAssetSchema = z.object({
  assetId: z.string().trim().min(1).max(64),
});
