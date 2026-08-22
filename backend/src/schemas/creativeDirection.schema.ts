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

/** Restaurant page archetype — drives LLM creative direction. */
export const archetypeSchema = z.enum([
  "story_led",
  "menu_forward",
  "visual_immersive",
  "reservation_first",
  "neighbourhood",
  "quick_service",
]);

/** One planned section with layout/emphasis/background/spacing intent. */
export const sectionPlanItemSchema = z.object({
  type: sectionTypeSchema,
  emphasis: z.enum(["hero", "major", "standard", "compact"]),
  layoutIntent: z.enum([
    "full_bleed",
    "split_left",
    "split_right",
    "centered",
    "editorial_columns",
    "grid",
    "band",
    "overlap",
    "marquee",
  ]),
  background: z.enum(["base", "alt", "dark", "accent", "image"]),
  spacing: z.enum(["tight", "normal", "roomy"]),
});

/** Brand narrative — copy voice, proof points, avoid phrases. */
export const narrativeSchema = z.object({
  positioning: z.string().min(1),
  proofPoints: z.array(z.string()).max(4),
  voiceRules: z.array(z.string()).max(4),
  avoidPhrases: z.array(z.string()),
});

/** Visitor success mode for this surface (Impeccable: never Operate for restaurant marketing). */
export const designModeSchema = z.enum(["persuade", "experience"]);

/** One-line lock: what this place is, who it is for, what the page must do. */
export const designSubjectSchema = z.object({
  what: z.string().min(1),
  audience: z.string().min(1),
  pageJob: z.string().min(1),
});

/** Single memorable device — spend boldness here, keep the rest quiet. */
export const designSignatureSchema = z.object({
  kind: z.string().min(1),
  section: sectionTypeSchema,
  note: z.string().min(1),
});

/** Whether the request describes a landing page, one scrolling page, or a site. */
export const siteKindSchema = z.enum(["landing", "single_page", "multi_page"]);

/**
 * One page in the planned site.
 * `role` is a free string so a new vertical can add roles as data.
 */
export const pagePlanItemSchema = z.object({
  role: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  sections: z.array(sectionTypeSchema),
});

/** The site's page structure. Single-page sites carry exactly one entry. */
export const sitePlanSchema = z.object({
  kind: siteKindSchema,
  pages: z.array(pagePlanItemSchema).min(1),
  reason: z.string().min(1),
});

/** Page-level spatial density — drives spacing and container measure. */
export const designDensitySchema = z.enum(["compact", "normal", "spacious"]);

/** Page-level heading scale — drives the display type ramp. */
export const designTypeScaleSchema = z.enum(["compact", "normal", "expressive"]);

/**
 * Page-level design system decisions that apply to every section, as opposed to
 * SectionPlanItem which is per section.
 */
export const designSystemSchema = z.object({
  density: designDensitySchema,
  typeScale: designTypeScaleSchema,
});

export const creativePaletteSchema = z.object({
  accent: z.string().min(1),
  accentContrast: z.string().min(1),
  bg: z.string().optional(),
  bgAlt: z.string().optional(),
  ink: z.string().optional(),
  fontDisplay: z.string().optional(),
  fontBody: z.string().optional(),
});

/**
 * Creative Director output — family, palette, seeded variant hints.
 * Wave 3: extended with optional archetype, sectionPlan, narrative, paletteId, typePairId.
 */
export const creativeDirectionSchema = z.object({
  family: familySchema,
  seed: z.string().min(1),
  palette: creativePaletteSchema.nullable(),
  /** Whether palette came from client brandColors or was invented. */
  paletteSource: z.enum(["client_brand", "creative_pick", "theme_default"]),
  sectionVariantHints: z.record(sectionTypeSchema, z.string()),
  rationale: z.string().min(1),
  /** Wave 3: page experience archetype. */
  archetype: archetypeSchema.optional(),
  /** Wave 3: ordered section plan with layout intent per section. */
  sectionPlan: z.array(sectionPlanItemSchema).optional(),
  /** Wave 3: brand narrative for copy generation. */
  narrative: narrativeSchema.optional(),
  /** Wave 3: palette catalog id (e.g. "horeca-italian-warm"). */
  paletteId: z.string().optional(),
  /** Wave 3: typography pair id (e.g. "editorial-serif"). */
  typePairId: z.string().optional(),
  /** Impeccable surface mode — persuade (default) or experience (gallery-led). */
  mode: designModeSchema.optional(),
  /** Subject lock used by copy + director. */
  subject: designSubjectSchema.optional(),
  /** One signature device driving emphasis and variant hints. */
  signature: designSignatureSchema.optional(),
  /** Page-level density + type scale applied by the renderer. */
  designSystem: designSystemSchema.optional(),
  /** Planned page structure. Absent on directions generated before Phase 1.1. */
  sitePlan: sitePlanSchema.optional(),
});

export type CreativePalette = z.infer<typeof creativePaletteSchema>;
export type CreativeDirection = z.infer<typeof creativeDirectionSchema>;
export type Archetype = z.infer<typeof archetypeSchema>;
export type SectionPlanItem = z.infer<typeof sectionPlanItemSchema>;
export type Narrative = z.infer<typeof narrativeSchema>;
export type DesignMode = z.infer<typeof designModeSchema>;
export type DesignSubject = z.infer<typeof designSubjectSchema>;
export type DesignSignature = z.infer<typeof designSignatureSchema>;
export type DesignDensity = z.infer<typeof designDensitySchema>;
export type DesignTypeScale = z.infer<typeof designTypeScaleSchema>;
export type DesignSystemSpec = z.infer<typeof designSystemSchema>;
export type SiteKind = z.infer<typeof siteKindSchema>;
export type PagePlanItem = z.infer<typeof pagePlanItemSchema>;
export type SitePlan = z.infer<typeof sitePlanSchema>;
