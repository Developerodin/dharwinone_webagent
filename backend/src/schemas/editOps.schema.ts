import { z } from "zod";
import { sectionTypeSchema } from "./page.schema.js";

const familySchema = z.enum([
  "premium",
  "elegant",
  "minimal",
  "rustic",
  "vibrant",
]);

/** Structured edit operations applied to an existing Page JSON. */
export const editOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_copy"),
    section: sectionTypeSchema,
    field: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    op: z.literal("set_menu_price"),
    name: z.string().min(1),
    price: z.number().nonnegative(),
  }),
  z.object({
    op: z.literal("rename_menu_item"),
    from: z.string().min(1),
    to: z.string().min(1),
  }),
  z.object({
    op: z.literal("remove_menu_item"),
    name: z.string().min(1),
  }),
  z.object({
    op: z.literal("cycle_image"),
    section: sectionTypeSchema,
    /** Null means "next image"; OpenAI structured outputs require nullable not optional. */
    index: z.number().int().nonnegative().nullable(),
  }),
  z.object({
    op: z.literal("set_image"),
    section: sectionTypeSchema,
    imagePath: z.string().min(1),
  }),
  z.object({
    op: z.literal("set_theme"),
    family: familySchema,
  }),
  z.object({
    op: z.literal("set_gallery_count"),
    count: z.number().int().min(1).max(6),
  }),
  z.object({
    op: z.literal("rewrite_copy"),
    section: sectionTypeSchema,
    field: z.string().min(1),
    /** Null = use a sensible default word budget. */
    maxWords: z.number().int().positive().nullable(),
    hint: z.string().nullable(),
  }),
  z.object({
    op: z.literal("cycle_section_component"),
    section: sectionTypeSchema,
  }),
]);

export const editOpsResponseSchema = z.object({
  ops: z.array(editOpSchema),
  summary: z.string().min(1),
});

export type EditOp = z.infer<typeof editOpSchema>;
export type EditOpsResponse = z.infer<typeof editOpsResponseSchema>;
