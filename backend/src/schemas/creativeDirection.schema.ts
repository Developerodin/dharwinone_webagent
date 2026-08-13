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
});

export type CreativePalette = z.infer<typeof creativePaletteSchema>;
export type CreativeDirection = z.infer<typeof creativeDirectionSchema>;
export type Archetype = z.infer<typeof archetypeSchema>;
export type SectionPlanItem = z.infer<typeof sectionPlanItemSchema>;
export type Narrative = z.infer<typeof narrativeSchema>;
