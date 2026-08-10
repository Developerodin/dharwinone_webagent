import { z } from "zod";
import type { PageFamily } from "../config/pageFamily.js";
import type { SectionType } from "./page.schema.js";

/** LLM-copy fields for hero sections */
export const heroContentSchema = z.object({
  headline: z.string().min(1),
  subheading: z.string().min(1),
  ctaLabel: z.string().min(1),
});

/** LLM-copy fields for menu sections (items come from brief, not LLM) */
export const menuContentSchema = z.object({
  sectionTitle: z.string().min(1),
  introText: z.string().min(1),
});

/** LLM-copy fields for about sections */
export const aboutContentSchema = z.object({
  headline: z.string().min(1),
  body: z.string().min(1),
});

/** LLM-copy fields for gallery sections */
export const galleryContentSchema = z.object({
  headline: z.string().min(1),
  caption: z.string().min(1),
});

/** LLM-copy fields for location sections */
export const locationContentSchema = z.object({
  headline: z.string().min(1),
  directionsNote: z.string().min(1),
});

/** LLM-copy fields for services sections (items enriched in pipeline) */
export const servicesContentSchema = z.object({
  headline: z.string().min(1),
  introText: z.string().min(1),
});

/** LLM-copy fields for stats sections (items enriched in pipeline) */
export const statsContentSchema = z.object({
  headline: z.string().min(1),
});

/** LLM-copy fields for testimonials (quotes enriched in pipeline) */
export const testimonialsContentSchema = z.object({
  headline: z.string().min(1),
  introText: z.string().min(1),
});

/** LLM-copy fields for team sections (members enriched in pipeline) */
export const teamContentSchema = z.object({
  headline: z.string().min(1),
  introText: z.string().min(1),
});

/** LLM-copy fields for reservation CTA sections */
export const reservationContentSchema = z.object({
  headline: z.string().min(1),
  body: z.string().min(1),
  ctaLabel: z.string().min(1),
});

/** Site header brand + nav labels */
export const headerContentSchema = z.object({
  brandName: z.string().min(1),
  tagline: z.string().min(1),
  ctaLabel: z.string().min(1),
  eyebrow: z.string().min(1),
});

/** Contact / reservation form section */
export const contactContentSchema = z.object({
  headline: z.string().min(1),
  introText: z.string().min(1),
  ctaLabel: z.string().min(1),
});

/** Footer section */
export const footerContentSchema = z.object({
  tagline: z.string().min(1),
  copyright: z.string().min(1),
});

export type HeroContent = z.infer<typeof heroContentSchema>;
export type MenuContent = z.infer<typeof menuContentSchema>;
export type AboutContent = z.infer<typeof aboutContentSchema>;
export type GalleryContent = z.infer<typeof galleryContentSchema>;
export type LocationContent = z.infer<typeof locationContentSchema>;
export type ServicesContent = z.infer<typeof servicesContentSchema>;
export type StatsContent = z.infer<typeof statsContentSchema>;
export type TestimonialsContent = z.infer<typeof testimonialsContentSchema>;
export type TeamContent = z.infer<typeof teamContentSchema>;
export type ReservationContent = z.infer<typeof reservationContentSchema>;
export type HeaderContent = z.infer<typeof headerContentSchema>;
export type ContactContent = z.infer<typeof contactContentSchema>;
export type FooterContent = z.infer<typeof footerContentSchema>;

export type ComponentManifest = {
  componentId: string;
  sectionType: string;
  copyFields: readonly string[];
  contentSchema: z.ZodType<Record<string, unknown>>;
  requiresImage: boolean;
};

type SectionManifestSpec = {
  sectionType: SectionType;
  copyFields: readonly string[];
  contentSchema: z.ZodType<Record<string, unknown>>;
  requiresImage: boolean;
  /** Location ids use "location" not "location_map" in the component id. */
  idSegment?: string;
  variants: readonly string[];
};

const SECTION_SPECS: SectionManifestSpec[] = [
  {
    sectionType: "header",
    copyFields: ["brandName", "tagline", "ctaLabel", "eyebrow"],
    contentSchema: headerContentSchema,
    requiresImage: false,
    variants: ["01"],
  },
  {
    sectionType: "hero",
    copyFields: ["headline", "subheading", "ctaLabel"],
    contentSchema: heroContentSchema,
    requiresImage: true,
    variants: ["01", "02"],
  },
  {
    sectionType: "about",
    copyFields: ["headline", "body"],
    contentSchema: aboutContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "services",
    copyFields: ["headline", "introText"],
    contentSchema: servicesContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "menu",
    copyFields: ["sectionTitle", "introText"],
    contentSchema: menuContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "stats",
    copyFields: ["headline"],
    contentSchema: statsContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "gallery",
    copyFields: ["headline", "caption"],
    contentSchema: galleryContentSchema,
    requiresImage: true,
    variants: ["01", "02"],
  },
  {
    sectionType: "testimonials",
    copyFields: ["headline", "introText"],
    contentSchema: testimonialsContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "team",
    copyFields: ["headline", "introText"],
    contentSchema: teamContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "reservation",
    copyFields: ["headline", "body", "ctaLabel"],
    contentSchema: reservationContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "location_map",
    copyFields: ["headline", "directionsNote"],
    contentSchema: locationContentSchema,
    requiresImage: false,
    idSegment: "location",
    variants: ["01", "02"],
  },
  {
    sectionType: "contact",
    copyFields: ["headline", "introText", "ctaLabel"],
    contentSchema: contactContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
  {
    sectionType: "footer",
    copyFields: ["tagline", "copyright"],
    contentSchema: footerContentSchema,
    requiresImage: false,
    variants: ["01", "02"],
  },
];

/**
 * Builds a section manifest entry reusing shared content schemas.
 */
function manifest(
  componentId: string,
  sectionType: string,
  copyFields: readonly string[],
  contentSchema: z.ZodType<Record<string, unknown>>,
  requiresImage: boolean,
): ComponentManifest {
  return { componentId, sectionType, copyFields, contentSchema, requiresImage };
}

/**
 * Builds all component manifests for a page family.
 */
function buildFamilyManifests(
  family: PageFamily,
  heroVariants: readonly string[] = ["01", "02"],
): Record<string, ComponentManifest> {
  const entries: Record<string, ComponentManifest> = {};

  for (const spec of SECTION_SPECS) {
    const variants =
      spec.sectionType === "hero" ? heroVariants : spec.variants;
    const segment = spec.idSegment ?? spec.sectionType;
    for (const variant of variants) {
      const componentId = `${family}-${segment}-${variant}`;
      entries[componentId] = manifest(
        componentId,
        spec.sectionType,
        spec.copyFields,
        spec.contentSchema,
        spec.requiresImage,
      );
    }
  }

  return entries;
}

/**
 * Registry of component manifests — multiple variants per section type.
 */
export const COMPONENT_MANIFESTS: Record<string, ComponentManifest> = {
  ...buildFamilyManifests("premium", ["01", "02", "03"]),
  ...buildFamilyManifests("elegant", ["01", "02", "03"]),
  ...buildFamilyManifests("minimal"),
  ...buildFamilyManifests("rustic"),
  ...buildFamilyManifests("vibrant"),
};

/**
 * Resolves a manifest by component id.
 */
export function getManifest(componentId: string): ComponentManifest {
  const manifestEntry = COMPONENT_MANIFESTS[componentId];
  if (!manifestEntry) {
    throw new Error(`Unknown component manifest: ${componentId}`);
  }
  return manifestEntry;
}
