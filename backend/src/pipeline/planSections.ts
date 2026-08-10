import type { SectionType } from "../schemas/page.schema.js";

/** Cafeu / Gericht / Kaiseki-style casual discovery page spine. */
const CASUAL_DISCOVERY_SECTIONS: SectionType[] = [
  "header",
  "hero",
  "about",
  "services",
  "menu",
  "stats",
  "gallery",
  "testimonials",
  "team",
  "reservation",
  "location_map",
  "contact",
  "footer",
];

/**
 * Stage 2 — pure code: fixed section list for casual_discovery.
 */
export function planSections(): SectionType[] {
  return [...CASUAL_DISCOVERY_SECTIONS];
}
