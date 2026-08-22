import type { ComponentSpec } from "../schemas/componentSpec.schema.js";
import { defineSpec, type ComponentTraits } from "./contracts.js";
import type { SectionType } from "../schemas/page.schema.js";

/**
 * Family-kit components.
 *
 * `createFamilyRegistry` builds minimal, rustic, vibrant — and every bold "-03"
 * slot — from one set of shared React factories. Their specs are therefore
 * generated from one trait table too: the implementations really are identical,
 * and duplicating the metadata by hand would only let it drift.
 *
 * Only `styles` differs per family, because only the token bundle differs.
 */
const KIT: Array<[SectionType, string, ComponentTraits]> = [
  ["header", "01", { layoutFamily: "band", styles: ["clean"], density: 2, visualWeight: 2, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } }],
  ["header", "02", { layoutFamily: "band", styles: ["centred"], density: 2, visualWeight: 2, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } }],
  ["header", "03", { layoutFamily: "band", styles: ["compact", "direct"], density: 3, visualWeight: 1, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } }],

  ["hero", "01", { layoutFamily: "immersive", styles: ["cinematic", "photographic"], density: 2, visualWeight: 5, surfaces: ["image"], media: { min: 1, max: 1 }, adjacency: { goodAfter: ["band"] } }],
  ["hero", "02", { layoutFamily: "split", styles: ["editorial", "considered"], density: 3, visualWeight: 4, surfaces: ["base", "alt"], media: { min: 1, max: 1 }, slots: { subheading: { required: true } }, adjacency: { goodAfter: ["band"] } }],
  ["hero", "03", { layoutFamily: "feature", styles: ["typographic", "editorial"], density: 2, visualWeight: 5, surfaces: ["base", "alt", "image"], media: { min: 1, max: 1 }, adjacency: { goodAfter: ["band"] } }],

  ["about", "01", { layoutFamily: "split", styles: ["considered", "clean"], density: 2, visualWeight: 3, surfaces: ["base", "alt"], adjacency: { goodAfter: ["immersive"] } }],
  ["about", "02", { layoutFamily: "editorial", styles: ["editorial", "story"], density: 2, visualWeight: 3, surfaces: ["base", "alt", "dark"], slots: { body: { maxChars: 420 } } }],
  ["about", "03", { layoutFamily: "feature", styles: ["architectural", "bold"], density: 3, visualWeight: 4, surfaces: ["base", "alt"], adjacency: { avoidAfter: ["feature"] } }],

  ["services", "01", { layoutFamily: "grid", styles: ["clean"], density: 4, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 4 }, adjacency: { avoidAfter: ["grid"] } }],
  ["services", "02", { layoutFamily: "editorial", styles: ["editorial", "quiet"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 4 } }],
  ["services", "03", { layoutFamily: "list", styles: ["manifesto", "restrained"], density: 2, visualWeight: 3, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 }, list: { min: 2, max: 4 } }],

  ["menu", "01", { layoutFamily: "list", styles: ["readable", "quiet"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 12 } }],
  ["menu", "02", { layoutFamily: "grid", styles: ["clean", "modern"], density: 4, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 12 }, adjacency: { avoidAfter: ["grid"] } }],
  ["menu", "03", { layoutFamily: "feature", styles: ["dish-led", "editorial"], density: 3, visualWeight: 4, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 10 }, adjacency: { avoidAfter: ["feature"] } }],

  ["stats", "01", { layoutFamily: "grid", styles: ["clean"], density: 4, visualWeight: 2, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 }, adjacency: { avoidAfter: ["grid"] } }],
  ["stats", "02", { layoutFamily: "split", styles: ["editorial"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 }, adjacency: { avoidAfter: ["split"] } }],
  ["stats", "03", { layoutFamily: "band", styles: ["restrained", "quiet"], density: 2, visualWeight: 1, surfaces: ["base", "alt", "dark", "accent"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 } }],

  ["gallery", "01", { layoutFamily: "grid", styles: ["photographic", "clean"], density: 4, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 3, max: 4 }, adjacency: { avoidAfter: ["grid"] } }],
  ["gallery", "02", { layoutFamily: "grid", styles: ["photographic", "bento", "kinetic"], density: 4, visualWeight: 4, surfaces: ["base", "alt", "dark"], media: { min: 2, max: 4 }, adjacency: { avoidAfter: ["grid"] } }],
  ["gallery", "03", { layoutFamily: "feature", styles: ["photographic", "cinematic"], density: 3, visualWeight: 4, surfaces: ["base", "alt"], media: { min: 3, max: 4 }, adjacency: { avoidAfter: ["feature"] } }],

  ["testimonials", "01", { layoutFamily: "feature", styles: ["warm"], density: 2, visualWeight: 3, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 }, list: { min: 2, max: 8 }, adjacency: { avoidAfter: ["feature"] } }],
  ["testimonials", "02", { layoutFamily: "grid", styles: ["clean", "modern"], density: 4, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 9 }, adjacency: { avoidAfter: ["grid"] } }],
  ["testimonials", "03", { layoutFamily: "editorial", styles: ["editorial", "restrained"], density: 1, visualWeight: 3, surfaces: ["base", "alt", "dark", "accent"], media: { min: 0, max: 0 }, list: { min: 2, max: 6 } }],

  ["team", "01", { layoutFamily: "grid", styles: ["clean"], density: 3, visualWeight: 3, surfaces: ["base", "alt"], media: { min: 2, max: 3 }, list: { min: 2, max: 3 }, adjacency: { avoidAfter: ["grid"] } }],
  ["team", "02", { layoutFamily: "feature", styles: ["editorial", "asymmetric"], density: 3, visualWeight: 4, surfaces: ["base", "alt"], media: { min: 2, max: 3 }, list: { min: 2, max: 3 }, adjacency: { avoidAfter: ["feature"] } }],
  ["team", "03", { layoutFamily: "editorial", styles: ["editorial", "quiet"], density: 2, visualWeight: 3, surfaces: ["base", "alt", "dark"], media: { min: 1, max: 1 }, list: { min: 2, max: 3 } }],

  ["reservation", "01", { layoutFamily: "band", styles: ["direct"], density: 2, visualWeight: 3, surfaces: ["base", "alt", "dark", "accent"], media: { min: 0, max: 0 } }],
  ["reservation", "02", { layoutFamily: "band", styles: ["direct", "bold"], density: 2, visualWeight: 4, surfaces: ["base", "alt", "dark", "accent"], media: { min: 0, max: 0 } }],
  ["reservation", "03", { layoutFamily: "editorial", styles: ["editorial", "direct", "quiet"], density: 2, visualWeight: 3, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } }],

  ["location_map", "01", { layoutFamily: "split", styles: ["direct", "clean"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 1, max: 1 }, adjacency: { avoidAfter: ["split"] } }],
  ["location_map", "02", { layoutFamily: "split", styles: ["direct", "modern"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 1, max: 1 }, adjacency: { avoidAfter: ["split"] } }],
  ["location_map", "03", { layoutFamily: "feature", styles: ["typographic", "bold"], density: 2, visualWeight: 4, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 }, adjacency: { avoidAfter: ["feature"] } }],

  ["contact", "01", { layoutFamily: "split", styles: ["direct", "clean"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, adjacency: { avoidAfter: ["split"] } }],
  ["contact", "02", { layoutFamily: "split", styles: ["direct", "modern"], density: 3, visualWeight: 2, surfaces: ["base", "alt"], media: { min: 0, max: 0 }, adjacency: { avoidAfter: ["split"] } }],

  ["footer", "01", { layoutFamily: "band", styles: ["clean"], density: 3, visualWeight: 1, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } }],
  ["footer", "02", { layoutFamily: "band", styles: ["atmospheric"], density: 3, visualWeight: 1, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } }],
  ["footer", "03", { layoutFamily: "band", styles: ["compact", "restrained"], density: 2, visualWeight: 1, surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 } }],
];

/** Extra style tags per family — the token bundle is the only real difference. */
const FAMILY_STYLES: Record<string, string[]> = {
  minimal: ["minimal", "quiet", "monochrome"],
  rustic: ["rustic", "warm", "craft"],
  vibrant: ["vibrant", "playful", "bold"],
};

/** Families rendered entirely by the shared kit. */
export const KIT_FAMILIES = Object.keys(FAMILY_STYLES);

/** Slots bold inherits from the kit rather than overriding. */
export const BOLD_KIT_VARIANTS = new Set(["03"]);

export const FAMILY_KIT_SPECS: ComponentSpec[] = KIT_FAMILIES.flatMap((family) =>
  KIT.map(([section, variant, traits]) =>
    defineSpec(family, section, variant, {
      ...traits,
      styles: [...new Set([...traits.styles, ...FAMILY_STYLES[family]!])],
    }),
  ),
);

/** The kit trait table, so bold can reuse it for the slots it does not override. */
export const KIT_TRAITS = KIT;
