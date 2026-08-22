import type { ComponentSpec } from "../schemas/componentSpec.schema.js";
import { defineSpec, type ComponentTraits } from "./contracts.js";
import type { SectionType } from "../schemas/page.schema.js";
import { KIT_TRAITS } from "./familyKit.specs.js";

/**
 * Bold family — Demo9-style bespoke components for the 01/02 slots, with every
 * "-03" slot inherited from the shared family kit (see `boldRegistry`).
 *
 * Several bold slots point at the same implementation: header 01/02/03 are all
 * `BoldHeader01`, and 01/02 share a component for most sections. Their specs
 * are identical because the components are — the ranker then treats them as
 * genuinely interchangeable rather than pretending there is variety.
 */
const BOLD_STYLES = ["bold", "punchy", "casual"];

/** Bespoke bold implementations, keyed by "<idSegment>-<variant>". */
const BESPOKE: Record<string, ComponentTraits> = {
  "header-01": { layoutFamily: "band", styles: ["bold", "compact"], density: 3, visualWeight: 2, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } },
  "hero-01": { layoutFamily: "immersive", styles: ["bold", "sunburst", "playful"], density: 3, visualWeight: 5, surfaces: ["base", "alt", "image"], media: { min: 1, max: 4 }, adjacency: { goodAfter: ["band"] } },
  "hero-02": { layoutFamily: "split", styles: ["bold", "punchy"], density: 3, visualWeight: 4, surfaces: ["base", "alt"], media: { min: 1, max: 1 }, adjacency: { goodAfter: ["band"] } },
  "about-01": { layoutFamily: "split", styles: ["bold", "warm"], density: 3, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 1, max: 1 } },
  "services-01": { layoutFamily: "grid", styles: ["bold", "casual"], density: 4, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 4 }, adjacency: { avoidAfter: ["grid"] } },
  "menu-01": { layoutFamily: "grid", styles: ["bold", "casual"], density: 4, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 12 }, adjacency: { avoidAfter: ["grid"] } },
  "stats-01": { layoutFamily: "band", styles: ["bold", "punchy"], density: 3, visualWeight: 2, surfaces: ["base", "alt", "accent"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 } },
  "gallery-01": { layoutFamily: "grid", styles: ["bold", "photographic"], density: 4, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 3, max: 4 }, adjacency: { avoidAfter: ["grid"] } },
  "testimonials-01": { layoutFamily: "grid", styles: ["bold", "casual"], density: 4, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 9 }, adjacency: { avoidAfter: ["grid"] } },
  "team-01": { layoutFamily: "grid", styles: ["bold", "casual"], density: 3, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 2, max: 3 }, list: { min: 2, max: 3 }, adjacency: { avoidAfter: ["grid"] } },
  "reservation-01": { layoutFamily: "band", styles: ["bold", "direct"], density: 2, visualWeight: 4, surfaces: ["base", "alt", "accent"], media: { min: 0, max: 0 } },
  "location-01": { layoutFamily: "split", styles: ["bold", "direct"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, adjacency: { avoidAfter: ["split"] } },
  "contact-01": { layoutFamily: "split", styles: ["bold", "direct"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, adjacency: { avoidAfter: ["split"] } },
  "footer-01": { layoutFamily: "band", styles: ["bold", "casual"], density: 3, visualWeight: 1, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } },
};

/**
 * Slots where bold aliases a second variant onto the same implementation.
 * Mirrors `boldRegistry`, where e.g. bold-menu-02 === bold-menu-01.
 */
const ALIASES: Record<string, string> = {
  "header-02": "header-01",
  "header-03": "header-01",
  "about-02": "about-01",
  "services-02": "services-01",
  "menu-02": "menu-01",
  "stats-02": "stats-01",
  "gallery-02": "gallery-01",
  "testimonials-02": "testimonials-01",
  "team-02": "team-01",
  "reservation-02": "reservation-01",
  "location-02": "location-01",
  "contact-02": "contact-01",
  "footer-02": "footer-01",
};

/**
 * Builds every bold slot: bespoke where one exists, aliased where bold reuses
 * a component, and kit-derived for the remaining "-03" signature slots.
 */
export const BOLD_SPECS: ComponentSpec[] = KIT_TRAITS.map(
  ([section, variant, kitTraits]) => {
    const segment = section === "location_map" ? "location" : section;
    const key = `${segment}-${variant}`;
    const traits =
      BESPOKE[key] ??
      (ALIASES[key] ? BESPOKE[ALIASES[key]!] : undefined) ??
      {
        ...kitTraits,
        styles: [...new Set([...kitTraits.styles, ...BOLD_STYLES])],
      };
    return defineSpec("bold", section as SectionType, variant, traits);
  },
);
