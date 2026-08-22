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

export const themeOverridesSchema = z
  .object({
    accent: z.string().optional(),
    accentContrast: z.string().optional(),
    bg: z.string().optional(),
    bgAlt: z.string().optional(),
    bgDark: z.string().optional(),
    card: z.string().optional(),
    muted: z.string().optional(),
    onDark: z.string().optional(),
    ink: z.string().optional(),
    fontDisplay: z.string().optional(),
    fontBody: z.string().optional(),
  })
  .optional();

export const sectionStyleOverridesSchema = z
  .object({
    background: z.string().optional(),
    text: z.string().optional(),
    button: z.string().optional(),
    paddingY: z.enum(["tight", "normal", "roomy"]).optional(),
  })
  .optional();

/** Parameterised layout intent from Creative Director (Wave 4). */
export const sectionLayoutSchema = z.object({
  emphasis: z.enum(["hero", "major", "standard", "compact"]).default("standard"),
  intent: z
    .enum([
      "full_bleed",
      "split_left",
      "split_right",
      "centered",
      "editorial_columns",
      "grid",
      "band",
      "overlap",
      "marquee",
    ])
    .default("full_bleed"),
  background: z
    .enum(["base", "alt", "dark", "accent", "image"])
    .default("base"),
  spacing: z.enum(["tight", "normal", "roomy"]).default("normal"),
});

export const pageSectionSchema = z.object({
  type: sectionTypeSchema,
  componentId: z.string().min(1),
  content: z.record(z.unknown()),
  assets: z.array(pageAssetSchema).default([]),
  styleOverrides: sectionStyleOverridesSchema,
  /** Optional layout parameters; omitted on legacy pages. */
  layout: sectionLayoutSchema.optional(),
  /** Layout combos the user already rejected (remix_section). */
  rejectedLayouts: z.array(sectionLayoutSchema).optional(),
});

/**
 * Final Page JSON assembled by the pipeline and consumed by PageRenderer.
 */
/** Page-level design decisions the renderer turns into CSS custom properties. */
export const pageDesignSchema = z
  .object({
    density: z.enum(["compact", "normal", "spacious"]).optional(),
    typeScale: z.enum(["compact", "normal", "expressive"]).optional(),
  })
  .optional();

export const pageSchema = z.object({
  sections: z.array(pageSectionSchema),
  themeOverrides: themeOverridesSchema,
  /** Optional; absent on pages generated before Phase 1. */
  design: pageDesignSchema,
});

export type SectionType = z.infer<typeof sectionTypeSchema>;
export type PageSection = z.infer<typeof pageSectionSchema>;
export type Page = z.infer<typeof pageSchema>;
export type PageDesign = NonNullable<z.infer<typeof pageDesignSchema>>;
export type ThemeOverrides = NonNullable<z.infer<typeof themeOverridesSchema>>;
export type SectionStyleOverrides = NonNullable<
  z.infer<typeof sectionStyleOverridesSchema>
>;
export type SectionLayout = z.infer<typeof sectionLayoutSchema>;

/** Default layout for legacy pages without layout metadata. */
export const DEFAULT_SECTION_LAYOUT: SectionLayout = {
  emphasis: "standard",
  intent: "full_bleed",
  background: "base",
  spacing: "normal",
};
