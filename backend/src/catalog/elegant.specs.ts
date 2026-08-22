import type { ComponentSpec } from "../schemas/componentSpec.schema.js";
import { defineSpec, type ComponentTraits } from "./contracts.js";
import type { SectionType } from "../schemas/page.schema.js";
import { PREMIUM_TRAITS } from "./premium.specs.js";

/**
 * Elegant family — Caverta-inspired bespoke implementations. Variant roles run
 * parallel to premium (01 classic, 02 alternate, 03 signature), so the shared
 * trait table is reused and only genuine divergences are overridden below.
 */
const ELEGANT_STYLES = ["luxury", "restrained", "gold"];

/** Where the elegant implementation differs structurally from premium's. */
const OVERRIDES: Partial<Record<string, Partial<ComponentTraits>>> = {
  // Left-aligned editorial *over* a full-bleed image, not a two-column split.
  "hero-02": { layoutFamily: "immersive", surfaces: ["image"], density: 2 },
  // Single-column tasting list rather than a sticky rail beside the dishes.
  "menu-02": { layoutFamily: "list", density: 2, visualWeight: 2 },
  // Dark atmospheric panel carrying its own photograph.
  "contact-02": { media: { min: 1, max: 1 }, surfaces: ["base", "alt", "dark"] },
  // Gold-framed even grid; no bento holes.
  "gallery-02": { layoutFamily: "grid", density: 3 },
  // Centred invite rather than a two-column block.
  "location-02": { layoutFamily: "band", density: 2 },
};

/** Elegant leans darker and quieter across the board. */
function elegantTraits(section: SectionType, variant: string, base: ComponentTraits): ComponentTraits {
  const key = `${section === "location_map" ? "location" : section}-${variant}`;
  const merged: ComponentTraits = {
    ...base,
    styles: [...new Set([...base.styles.filter((s) => s !== "warm"), ...ELEGANT_STYLES])],
    density: Math.max(1, base.density - 1),
    ...(OVERRIDES[key] ?? {}),
  };
  return merged;
}

export const ELEGANT_SPECS: ComponentSpec[] = PREMIUM_TRAITS.map(
  ([section, variant, traits]) =>
    defineSpec("elegant", section, variant, elegantTraits(section, variant, traits)),
);
