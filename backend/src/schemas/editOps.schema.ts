import { z } from "zod";
import { sectionTypeSchema } from "./page.schema.js";

const familySchema = z.enum([
  "premium",
  "elegant",
  "minimal",
  "rustic",
  "vibrant",
  "bold",
]);

const paddingYSchema = z.enum(["tight", "normal", "roomy"]);

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
    op: z.literal("add_menu_item"),
    name: z.string().min(1),
    price: z.number().nonnegative(),
    description: z.string().nullable(),
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
  z.object({
    op: z.literal("set_theme_tokens"),
    accent: z.string().nullable(),
    accentContrast: z.string().nullable(),
    bg: z.string().nullable(),
    bgAlt: z.string().nullable(),
    ink: z.string().nullable(),
    fontDisplay: z.string().nullable(),
    fontBody: z.string().nullable(),
  }),
  z.object({
    op: z.literal("set_section_style"),
    section: sectionTypeSchema,
    background: z.string().nullable(),
    text: z.string().nullable(),
    button: z.string().nullable(),
    paddingY: paddingYSchema.nullable(),
  }),
  z.object({
    op: z.literal("set_text_style"),
    section: sectionTypeSchema,
    field: z.string().min(1),
    match: z.string().min(1),
    color: z.string().min(1),
  }),
  z.object({
    op: z.literal("add_section"),
    section: sectionTypeSchema,
  }),
  z.object({
    op: z.literal("remove_section"),
    section: sectionTypeSchema,
  }),
  z.object({
    op: z.literal("reorder_section"),
    section: sectionTypeSchema,
    /** Absolute 0-based index among page.sections after move. */
    toIndex: z.number().int().nonnegative(),
  }),
  z.object({
    op: z.literal("set_section_spacing"),
    section: sectionTypeSchema,
    paddingY: paddingYSchema,
  }),
  z.object({
    op: z.literal("remix_layout"),
    /** Salt so repeated remixes diverge; null = timestamp at apply. */
    salt: z.string().nullable(),
  }),
  z.object({
    op: z.literal("remix_section"),
    section: sectionTypeSchema,
    /** Salt so repeated remixes diverge; null = timestamp at apply. */
    salt: z.string().nullable(),
  }),
  z.object({
    op: z.literal("set_location"),
    address: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    placeId: z.string().nullable(),
    mapsUrl: z.string().nullable(),
  }),
  z.object({
    op: z.literal("set_email"),
    email: z.string().min(1),
  }),
]);

export const editOpsResponseSchema = z.object({
  ops: z.array(editOpSchema),
  summary: z.string().min(1),
});

export type EditOp = z.infer<typeof editOpSchema>;
export type EditOpsResponse = z.infer<typeof editOpsResponseSchema>;
