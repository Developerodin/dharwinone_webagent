import type { Brief } from "../schemas/brief.schema.js";
import type { Page, PageSection, SectionType } from "../schemas/page.schema.js";
import { formatBriefHoursLines } from "./hoursFormat.js";

export const LOCATION_SYNC_SECTIONS: SectionType[] = [
  "location_map",
  "contact",
  "footer",
  "reservation",
];

export type LocationPatch = {
  address: string;
  lat: number;
  lng: number;
  placeId: string | null;
  mapsUrl: string | null;
};

/**
 * Writes address + map pin fields onto a section content record.
 */
export function withLocationContent(
  content: Record<string, unknown>,
  patch: LocationPatch,
): Record<string, unknown> {
  return {
    ...content,
    address: patch.address,
    lat: patch.lat,
    lng: patch.lng,
    placeId: patch.placeId,
    mapsUrl: patch.mapsUrl,
  };
}

/**
 * Copies brief location + email onto a section when those facts exist.
 */
export function hydrateLocationFacts(
  content: Record<string, unknown>,
  brief: Brief,
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...content,
    phone: brief.phone,
    address: brief.address,
  };
  if (brief.email) next.email = brief.email;
  if (typeof brief.lat === "number") next.lat = brief.lat;
  if (typeof brief.lng === "number") next.lng = brief.lng;
  if (brief.placeId) next.placeId = brief.placeId;
  const hours = formatBriefHoursLines(brief);
  if (hours.length > 0) next.hours = hours;
  return next;
}

/**
 * Applies a location pin to brief + every visit/contact surface on the page.
 */
export function applySetLocationOp(
  page: Page,
  brief: Brief,
  patch: LocationPatch,
): string {
  brief.address = patch.address;
  brief.lat = patch.lat;
  brief.lng = patch.lng;
  brief.placeId = patch.placeId;

  const updated: string[] = [];
  for (const type of LOCATION_SYNC_SECTIONS) {
    const section = page.sections.find((item: PageSection) => item.type === type);
    if (!section) continue;
    section.content = withLocationContent(section.content, patch);
    updated.push(type);
  }

  const where = updated.length > 0 ? updated.join(", ") : "brief";
  return `Updated location to ${patch.address} (${where}).`;
}
