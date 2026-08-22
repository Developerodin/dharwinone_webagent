import { z } from "zod";
import type { SectionType } from "./page.schema.js";
import { allSpecs } from "../catalog/index.js";

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
};

const SECTION_SPECS: SectionManifestSpec[] = [
  {
    sectionType: "header",
    copyFields: ["brandName", "tagline", "ctaLabel", "eyebrow"],
    contentSchema: headerContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "hero",
    copyFields: ["headline", "subheading", "ctaLabel"],
    contentSchema: heroContentSchema,
    requiresImage: true,
  },
  {
    sectionType: "about",
    copyFields: ["headline", "body"],
    contentSchema: aboutContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "services",
    copyFields: ["headline", "introText"],
    contentSchema: servicesContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "menu",
    copyFields: ["sectionTitle", "introText"],
    contentSchema: menuContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "stats",
    copyFields: ["headline"],
    contentSchema: statsContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "gallery",
    copyFields: ["headline", "caption"],
    contentSchema: galleryContentSchema,
    requiresImage: true,
  },
  {
    sectionType: "testimonials",
    copyFields: ["headline", "introText"],
    contentSchema: testimonialsContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "team",
    copyFields: ["headline", "introText"],
    contentSchema: teamContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "reservation",
    copyFields: ["headline", "body", "ctaLabel"],
    contentSchema: reservationContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "location_map",
    copyFields: ["headline", "directionsNote"],
    contentSchema: locationContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "contact",
    copyFields: ["headline", "introText", "ctaLabel"],
    contentSchema: contactContentSchema,
    requiresImage: false,
  },
  {
    sectionType: "footer",
    copyFields: ["tagline", "copyright"],
    contentSchema: footerContentSchema,
    requiresImage: false,
  },
];

/**
 * Content schema per section type. Shared by every implementation of a section,
 * and used to validate LLM copy shape.
 */
const SCHEMA_BY_SECTION = new Map<SectionType, SectionManifestSpec>(
  SECTION_SPECS.map((spec) => [spec.sectionType, spec]),
);

let manifestCache: Record<string, ComponentManifest> | null = null;

/**
 * Component manifests, derived from the catalog.
 *
 * Previously this expanded a hardcoded `variants: ["01","02","03"]` table per
 * family, so a fourth variant needed an edit here before it could exist. Now
 * the catalog is the single list of components and manifests follow from it.
 */
function buildManifests(): Record<string, ComponentManifest> {
  if (manifestCache) return manifestCache;
  const entries: Record<string, ComponentManifest> = {};

  for (const spec of allSpecs()) {
    const sectionSpec = SCHEMA_BY_SECTION.get(spec.section);
    if (!sectionSpec) continue;
    entries[spec.id] = {
      componentId: spec.id,
      sectionType: spec.section,
      // The component's own content contract, not the section-wide list.
      copyFields: Object.keys(spec.slots),
      contentSchema: sectionSpec.contentSchema,
      requiresImage: spec.media.min > 0,
    };
  }

  manifestCache = entries;
  return entries;
}

/**
 * Registry of component manifests, one per catalog component.
 */
export const COMPONENT_MANIFESTS: Record<string, ComponentManifest> =
  new Proxy({} as Record<string, ComponentManifest>, {
    get: (_target, key: string) => buildManifests()[key],
    has: (_target, key: string) => key in buildManifests(),
    ownKeys: () => Reflect.ownKeys(buildManifests()),
    getOwnPropertyDescriptor: (_target, key: string) => {
      const value = buildManifests()[key];
      return value
        ? { value, enumerable: true, configurable: true }
        : undefined;
    },
  });

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
