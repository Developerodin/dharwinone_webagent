import type { ComponentSpec } from "../schemas/componentSpec.schema.js";
import { defineSpec, type ComponentTraits } from "./contracts.js";
import type { SectionType } from "../schemas/page.schema.js";

/**
 * Premium family — bespoke implementations in `frontend/src/components/premium`.
 * Traits are read off each component's JSX: which grid it uses, how many media
 * nodes it renders, which surface token it applies.
 */
const PREMIUM: Array<[SectionType, string, ComponentTraits]> = [
  // ---------------------------------------------------------------- header
  ["header", "01", {
    layoutFamily: "band", styles: ["classic", "warm"], density: 2, visualWeight: 2,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],
  ["header", "02", {
    layoutFamily: "band", styles: ["editorial", "centred"], density: 2, visualWeight: 2,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],
  ["header", "03", {
    layoutFamily: "band", styles: ["modern", "compact", "direct"], density: 3, visualWeight: 1,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],

  // ------------------------------------------------------------------ hero
  ["hero", "01", {
    layoutFamily: "immersive", styles: ["cinematic", "warm", "classic"], density: 2, visualWeight: 5,
    surfaces: ["image"], media: { min: 1, max: 1 },
    slots: { headline: { maxChars: 62 } }, adjacency: { goodAfter: ["band"] },
  }],
  ["hero", "02", {
    layoutFamily: "split", styles: ["editorial", "modern", "considered"], density: 3, visualWeight: 4,
    surfaces: ["base", "alt"], media: { min: 1, max: 1 },
    slots: { subheading: { required: true } }, adjacency: { goodAfter: ["band"] },
  }],
  ["hero", "03", {
    layoutFamily: "immersive", styles: ["cinematic", "bold", "photographic"], density: 2, visualWeight: 5,
    surfaces: ["image"], media: { min: 2, max: 3 }, adjacency: { goodAfter: ["band"] },
  }],

  // ----------------------------------------------------------------- about
  ["about", "01", {
    layoutFamily: "split", styles: ["classic", "warm", "considered"], density: 2, visualWeight: 3,
    surfaces: ["base", "alt"], adjacency: { goodAfter: ["immersive"] },
  }],
  ["about", "02", {
    layoutFamily: "editorial", styles: ["editorial", "story", "modern"], density: 2, visualWeight: 3,
    surfaces: ["base", "alt", "dark"], slots: { body: { maxChars: 420 } },
    adjacency: { goodAfter: ["immersive", "band"] },
  }],
  ["about", "03", {
    layoutFamily: "feature", styles: ["editorial", "bold", "architectural"], density: 3, visualWeight: 4,
    surfaces: ["base", "alt"], slots: { body: { maxChars: 280 } },
    adjacency: { avoidAfter: ["feature"], goodAfter: ["immersive", "band"] },
  }],

  // -------------------------------------------------------------- services
  ["services", "01", {
    layoutFamily: "grid", styles: ["modern", "clean"], density: 4, visualWeight: 2,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 },
    adjacency: { avoidAfter: ["grid"] },
  }],
  ["services", "02", {
    layoutFamily: "editorial", styles: ["editorial", "quiet"], density: 3, visualWeight: 2,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 4 },
  }],
  ["services", "03", {
    layoutFamily: "list", styles: ["manifesto", "restrained", "editorial"], density: 2, visualWeight: 3,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 }, list: { min: 2, max: 4 },
  }],

  // ------------------------------------------------------------------ menu
  ["menu", "01", {
    layoutFamily: "list", styles: ["classic", "quiet", "readable"], density: 3, visualWeight: 2,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 12 },
    adjacency: { goodAfter: ["split", "editorial", "immersive"] },
  }],
  ["menu", "02", {
    layoutFamily: "split", styles: ["editorial", "modern", "considered"], density: 4, visualWeight: 3,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 3, max: 14 },
    adjacency: { avoidAfter: ["split"] },
  }],
  ["menu", "03", {
    layoutFamily: "feature", styles: ["bold", "dish-led", "editorial"], density: 3, visualWeight: 4,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 2, max: 10 },
    adjacency: { avoidAfter: ["feature"] },
  }],

  // ----------------------------------------------------------------- stats
  ["stats", "01", {
    layoutFamily: "grid", styles: ["modern", "clean"], density: 4, visualWeight: 2,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 },
    adjacency: { avoidAfter: ["grid"] },
  }],
  ["stats", "02", {
    layoutFamily: "split", styles: ["editorial", "considered"], density: 3, visualWeight: 2,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 },
    adjacency: { avoidAfter: ["split"] },
  }],
  ["stats", "03", {
    layoutFamily: "band", styles: ["restrained", "quiet", "editorial"], density: 2, visualWeight: 1,
    surfaces: ["base", "alt", "dark", "accent"], media: { min: 0, max: 0 }, list: { min: 3, max: 4 },
  }],

  // --------------------------------------------------------------- gallery
  ["gallery", "01", {
    layoutFamily: "grid", styles: ["photographic", "modern", "clean"], density: 4, visualWeight: 3,
    surfaces: ["base", "alt"], media: { min: 3, max: 4 }, adjacency: { avoidAfter: ["grid"] },
  }],
  ["gallery", "02", {
    layoutFamily: "grid", styles: ["photographic", "bento", "kinetic"], density: 4, visualWeight: 4,
    surfaces: ["base", "alt", "dark"], media: { min: 2, max: 4 }, adjacency: { avoidAfter: ["grid"] },
  }],
  ["gallery", "03", {
    layoutFamily: "feature", styles: ["photographic", "editorial", "cinematic"], density: 3, visualWeight: 4,
    surfaces: ["base", "alt"], media: { min: 3, max: 4 }, adjacency: { avoidAfter: ["feature"] },
  }],

  // ---------------------------------------------------------- testimonials
  ["testimonials", "01", {
    layoutFamily: "feature", styles: ["classic", "warm"], density: 2, visualWeight: 3,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 }, list: { min: 2, max: 8 },
    adjacency: { avoidAfter: ["feature"] },
  }],
  ["testimonials", "02", {
    layoutFamily: "grid", styles: ["modern", "clean"], density: 4, visualWeight: 2,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, list: { min: 3, max: 9 },
    adjacency: { avoidAfter: ["grid"] },
  }],
  ["testimonials", "03", {
    layoutFamily: "editorial", styles: ["editorial", "quiet", "restrained"], density: 1, visualWeight: 3,
    surfaces: ["base", "alt", "dark", "accent"], media: { min: 0, max: 0 }, list: { min: 2, max: 6 },
  }],

  // ------------------------------------------------------------------ team
  ["team", "01", {
    layoutFamily: "grid", styles: ["classic", "clean"], density: 3, visualWeight: 3,
    surfaces: ["base", "alt"], media: { min: 2, max: 3 }, list: { min: 2, max: 3 },
    adjacency: { avoidAfter: ["grid"] },
  }],
  ["team", "02", {
    layoutFamily: "feature", styles: ["editorial", "asymmetric"], density: 3, visualWeight: 4,
    surfaces: ["base", "alt"], media: { min: 2, max: 2 }, list: { min: 2, max: 3 },
    adjacency: { avoidAfter: ["feature"] },
  }],
  ["team", "03", {
    layoutFamily: "editorial", styles: ["editorial", "quiet"], density: 2, visualWeight: 3,
    surfaces: ["base", "alt", "dark"], media: { min: 1, max: 1 }, list: { min: 2, max: 3 },
  }],

  // ----------------------------------------------------------- reservation
  ["reservation", "01", {
    layoutFamily: "band", styles: ["classic", "direct"], density: 2, visualWeight: 3,
    surfaces: ["base", "alt", "dark", "accent"], media: { min: 0, max: 0 },
  }],
  ["reservation", "02", {
    layoutFamily: "immersive", styles: ["cinematic", "bold"], density: 2, visualWeight: 5,
    surfaces: ["image"], media: { min: 1, max: 1 }, adjacency: { avoidAfter: ["immersive"] },
  }],
  ["reservation", "03", {
    layoutFamily: "editorial", styles: ["editorial", "direct", "quiet"], density: 2, visualWeight: 3,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],

  // ---------------------------------------------------------- location_map
  ["location_map", "01", {
    layoutFamily: "band", styles: ["classic", "quiet", "direct"], density: 2, visualWeight: 2,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],
  ["location_map", "02", {
    layoutFamily: "split", styles: ["modern", "direct"], density: 3, visualWeight: 2,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, adjacency: { avoidAfter: ["split"] },
  }],
  ["location_map", "03", {
    layoutFamily: "feature", styles: ["editorial", "bold", "typographic"], density: 2, visualWeight: 4,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
    adjacency: { avoidAfter: ["feature"] },
  }],

  // --------------------------------------------------------------- contact
  ["contact", "01", {
    layoutFamily: "split", styles: ["classic", "direct", "modern"], density: 3, visualWeight: 2,
    surfaces: ["base", "alt"], media: { min: 0, max: 0 }, adjacency: { avoidAfter: ["split"] },
  }],
  ["contact", "02", {
    layoutFamily: "split", styles: ["cinematic", "editorial", "direct"], density: 3, visualWeight: 3,
    surfaces: ["base", "alt", "dark"], media: { min: 1, max: 1 },
    adjacency: { avoidAfter: ["split"] },
  }],

  // ---------------------------------------------------------------- footer
  ["footer", "01", {
    layoutFamily: "band", styles: ["classic", "warm"], density: 3, visualWeight: 1,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],
  ["footer", "02", {
    layoutFamily: "band", styles: ["modern", "clean"], density: 3, visualWeight: 1,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],
  ["footer", "03", {
    layoutFamily: "band", styles: ["restrained", "compact", "editorial"], density: 2, visualWeight: 1,
    surfaces: ["base", "alt", "dark"], media: { min: 0, max: 0 },
  }],
];

export const PREMIUM_SPECS: ComponentSpec[] = PREMIUM.map(
  ([section, variant, traits]) => defineSpec("premium", section, variant, traits),
);

/** Shared trait table so sibling families can layer their own styles over it. */
export const PREMIUM_TRAITS = PREMIUM;
