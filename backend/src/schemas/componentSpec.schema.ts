import { z } from "zod";
import { sectionTypeSchema } from "./page.schema.js";

/**
 * Composition language a component speaks. Kept deliberately small: this is the
 * axis the generator reasons over for variety and adjacency, so a large set
 * would make every value meaningless.
 */
export const layoutFamilySchema = z.enum([
  "immersive", // media fills the band, copy sits over it
  "split", // two columns, media beside copy
  "editorial", // stacked prose-led composition
  "grid", // repeating tiles
  "list", // rows, no tiles
  "band", // short horizontal strip
  "feature", // one dominant element with supporting pieces
]);

/** Surface a component is designed to sit on. Matched against the plan. */
export const componentSurfaceSchema = z.enum([
  "base",
  "alt",
  "dark",
  "accent",
  "image",
]);

/** What a media slot is for — drives which image pool is queried. */
export const mediaRoleSchema = z.enum([
  "atmosphere",
  "subject",
  "portrait",
  "detail",
]);

/**
 * One content field a component renders.
 *
 * `maxChars` is the component's real layout budget, not a style preference:
 * it is what stops a 90-character headline breaking a hero designed for 60.
 * Consumed by the copy schema and by validation.
 */
export const contentSlotSchema = z.object({
  required: z.boolean(),
  maxChars: z.number().int().positive(),
  /** Short instruction handed to the copywriter for this field. */
  hint: z.string().optional(),
});

/** Media the component needs before it can render. */
export const mediaContractSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  role: mediaRoleSchema,
  orientation: z.enum(["landscape", "portrait", "square", "any"]),
});

/**
 * Repeating content a component lists (menu items, quotes, team members).
 * `min` is a hard gate: a three-column testimonial grid holding one quote looks
 * broken, so the component is not a candidate until the data exists.
 */
export const listContractSchema = z.object({
  key: z.string().min(1),
  min: z.number().int().positive(),
  max: z.number().int().positive(),
});

export const componentSpecSchema = z
  .object({
    /** Must match a key in the frontend component registry. */
    id: z.string().min(1),
    section: sectionTypeSchema,
    /** Theme bundle this implementation is written against. */
    family: z.string().min(1),

    layoutFamily: layoutFamilySchema,
    /** Mood tags matched against the Design DNA. */
    styles: z.array(z.string().min(1)).min(1),

    /** 1 = airy, 5 = packed. Drives adjacency and DNA density fit. */
    density: z.number().int().min(1).max(5),
    /** 1 = quiet, 5 = loud. Matched against the plan's emphasis. */
    visualWeight: z.number().int().min(1).max(5),

    /** Surfaces this component reads well on. */
    surfaces: z.array(componentSurfaceSchema).min(1),

    media: mediaContractSchema,
    slots: z.record(z.string(), contentSlotSchema),
    list: listContractSchema.optional(),

    adjacency: z
      .object({
        /** Layout families that read badly immediately before this one. */
        avoidAfter: z.array(layoutFamilySchema).optional(),
        /** Layout families this one is designed to follow. */
        goodAfter: z.array(layoutFamilySchema).optional(),
      })
      .optional(),

    /**
     * Universal by default. An include-list would force every existing
     * component to be re-tagged whenever an industry is added.
     */
    industries: z
      .object({ exclude: z.array(z.string().min(1)).optional() })
      .optional(),
  })
  .strict()
  .superRefine((spec, ctx) => {
    if (spec.media.max < spec.media.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${spec.id}: media.max (${spec.media.max}) is below media.min (${spec.media.min})`,
      });
    }
    if (spec.list && spec.list.max < spec.list.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${spec.id}: list.max is below list.min`,
      });
    }
    if (!spec.id.startsWith(`${spec.family}-`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `id "${spec.id}" does not start with family "${spec.family}-"`,
      });
    }
    if (Object.keys(spec.slots).length === 0 && !spec.list) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${spec.id}" declares no content at all`,
      });
    }
  });

export type ComponentSpec = z.infer<typeof componentSpecSchema>;
export type LayoutFamily = z.infer<typeof layoutFamilySchema>;
export type ComponentSurface = z.infer<typeof componentSurfaceSchema>;
export type ContentSlot = z.infer<typeof contentSlotSchema>;
export type MediaContract = z.infer<typeof mediaContractSchema>;
