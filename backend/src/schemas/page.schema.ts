import { z } from "zod";

export const sectionTypeSchema = z.enum([
  "header",
  "hero",
  "menu",
  "about",
  "gallery",
  "location_map",
  "services",
  "stats",
  "testimonials",
  "team",
  "reservation",
  "contact",
  "footer",
]);

export const pageAssetSchema = z.object({
  key: z.string().min(1),
  imagePath: z.string().min(1),
});

export const pageSectionSchema = z.object({
  type: sectionTypeSchema,
  componentId: z.string().min(1),
  content: z.record(z.unknown()),
  assets: z.array(pageAssetSchema).default([]),
});

/**
 * Final Page JSON assembled by the pipeline and consumed by PageRenderer.
 */
export const pageSchema = z.object({
  sections: z.array(pageSectionSchema),
});

export type SectionType = z.infer<typeof sectionTypeSchema>;
export type PageSection = z.infer<typeof pageSectionSchema>;
export type Page = z.infer<typeof pageSchema>;
