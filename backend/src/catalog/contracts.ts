import type {
  ComponentSpec,
  ContentSlot,
  MediaContract,
} from "../schemas/componentSpec.schema.js";
import type { SectionType } from "../schemas/page.schema.js";

/**
 * What a section role needs from the copywriter, regardless of which component
 * renders it. Character budgets are the tightest across that section's
 * implementations; a component with more room widens them in its own traits.
 *
 * Fields the pipeline enriches from brief facts (address, phone, hours,
 * navItems, items, members) are deliberately absent — the copywriter must not
 * invent them, so they are not part of any content contract.
 */
export const SECTION_CONTRACTS: Record<
  SectionType,
  {
    slots: Record<string, ContentSlot>;
    media: Pick<MediaContract, "role" | "orientation">;
    list?: { key: string; min: number; max: number };
  }
> = {
  header: {
    slots: {
      brandName: { required: true, maxChars: 40 },
      tagline: { required: true, maxChars: 72, hint: "6–12 words. Name the cuisine or the place." },
      ctaLabel: { required: true, maxChars: 24, hint: "A booking verb phrase." },
      eyebrow: { required: false, maxChars: 28 },
    },
    media: { role: "atmosphere", orientation: "landscape" },
  },
  hero: {
    slots: {
      headline: { required: true, maxChars: 62, hint: "The page thesis. One concrete noun from the brief." },
      subheading: { required: false, maxChars: 170 },
      ctaLabel: { required: true, maxChars: 24, hint: "Name the action." },
    },
    media: { role: "atmosphere", orientation: "landscape" },
  },
  about: {
    slots: {
      headline: { required: true, maxChars: 60 },
      body: { required: true, maxChars: 400 },
    },
    media: { role: "atmosphere", orientation: "portrait" },
  },
  services: {
    slots: {
      headline: { required: true, maxChars: 52 },
      introText: { required: true, maxChars: 240 },
    },
    media: { role: "atmosphere", orientation: "landscape" },
    list: { key: "items", min: 2, max: 4 },
  },
  menu: {
    slots: {
      sectionTitle: { required: true, maxChars: 44 },
      introText: { required: true, maxChars: 240 },
    },
    media: { role: "subject", orientation: "square" },
    list: { key: "items", min: 2, max: 14 },
  },
  stats: {
    slots: { headline: { required: true, maxChars: 48 } },
    media: { role: "atmosphere", orientation: "landscape" },
    list: { key: "items", min: 3, max: 4 },
  },
  gallery: {
    slots: {
      headline: { required: true, maxChars: 48 },
      caption: { required: false, maxChars: 160 },
    },
    media: { role: "atmosphere", orientation: "landscape" },
  },
  testimonials: {
    slots: {
      headline: { required: true, maxChars: 48 },
      introText: { required: false, maxChars: 180 },
    },
    media: { role: "portrait", orientation: "portrait" },
    list: { key: "items", min: 2, max: 9 },
  },
  team: {
    slots: {
      headline: { required: true, maxChars: 48 },
      introText: { required: false, maxChars: 180 },
    },
    media: { role: "portrait", orientation: "portrait" },
    list: { key: "members", min: 2, max: 3 },
  },
  reservation: {
    slots: {
      headline: { required: true, maxChars: 56 },
      body: { required: true, maxChars: 210 },
      ctaLabel: { required: true, maxChars: 24 },
    },
    media: { role: "atmosphere", orientation: "landscape" },
  },
  location_map: {
    slots: {
      headline: { required: true, maxChars: 48 },
      directionsNote: { required: true, maxChars: 210 },
    },
    media: { role: "atmosphere", orientation: "landscape" },
  },
  contact: {
    slots: {
      headline: { required: true, maxChars: 48 },
      introText: { required: true, maxChars: 210 },
      ctaLabel: { required: true, maxChars: 24 },
    },
    media: { role: "atmosphere", orientation: "landscape" },
  },
  footer: {
    slots: {
      tagline: { required: true, maxChars: 90 },
      copyright: { required: true, maxChars: 80 },
    },
    media: { role: "atmosphere", orientation: "landscape" },
  },
};

/** Component ids use "location" where the section type is "location_map". */
export function idSegmentFor(section: SectionType): string {
  return section === "location_map" ? "location" : section;
}

/**
 * The per-component half of a spec: everything that is a property of this
 * implementation rather than of the section role it fills.
 */
export type ComponentTraits = {
  layoutFamily: ComponentSpec["layoutFamily"];
  styles: string[];
  density: number;
  visualWeight: number;
  surfaces: ComponentSpec["surfaces"];
  /** Images this implementation renders. Defaults to one when omitted. */
  media?: { min: number; max: number };
  /** Narrows the section's list contract for tighter layouts. */
  list?: { min?: number; max?: number };
  /** Widens or tightens a slot for this implementation. */
  slots?: Record<string, Partial<ContentSlot>>;
  adjacency?: ComponentSpec["adjacency"];
};

/**
 * Builds a full spec by layering an implementation's traits over its section's
 * shared content contract.
 */
export function defineSpec(
  family: string,
  section: SectionType,
  variant: string,
  traits: ComponentTraits,
): ComponentSpec {
  const contract = SECTION_CONTRACTS[section];

  const slots: Record<string, ContentSlot> = {};
  for (const [name, slot] of Object.entries(contract.slots)) {
    slots[name] = { ...slot, ...(traits.slots?.[name] ?? {}) };
  }

  const media = traits.media ?? { min: 1, max: 1 };

  const list =
    contract.list && traits.list !== undefined
      ? {
          key: contract.list.key,
          min: traits.list.min ?? contract.list.min,
          max: traits.list.max ?? contract.list.max,
        }
      : contract.list;

  return {
    id: `${family}-${idSegmentFor(section)}-${variant}`,
    section,
    family,
    layoutFamily: traits.layoutFamily,
    styles: traits.styles,
    density: traits.density,
    visualWeight: traits.visualWeight,
    surfaces: traits.surfaces,
    media: { ...media, ...contract.media },
    slots,
    ...(list ? { list } : {}),
    ...(traits.adjacency ? { adjacency: traits.adjacency } : {}),
  };
}
