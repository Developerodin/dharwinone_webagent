import { pageComponentRegistry } from "@/components/pageRegistry";
import {
  getFamilyFromComponentId,
  PAGE_FAMILIES,
  type PageFamily,
} from "@/lib/pageFamily";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import type { SectionType } from "@/types/page";

export type GalleryEntry = {
  id: string;
  family: PageFamily;
  sectionType: SectionType;
  variant: string;
  label: string;
};

export type GallerySectionGroup = {
  sectionType: SectionType;
  label: string;
  entries: GalleryEntry[];
};

export type GalleryFilters = {
  family: PageFamily | "all";
  sectionType: SectionType | "all";
};

/** Display order for section groups in the catalog. */
export const GALLERY_SECTION_ORDER: readonly SectionType[] = [
  "header",
  "hero",
  "about",
  "menu",
  "services",
  "stats",
  "gallery",
  "testimonials",
  "team",
  "reservation",
  "location_map",
  "contact",
  "footer",
];

/** Human labels for section types in the catalog UI. */
export const GALLERY_SECTION_LABELS: Record<SectionType, string> = {
  header: "Header",
  hero: "Hero",
  menu: "Menu",
  about: "About",
  gallery: "Gallery",
  location_map: "Location",
  services: "Services",
  stats: "Stats",
  testimonials: "Testimonials",
  team: "Team",
  reservation: "Reservation",
  contact: "Contact",
  footer: "Footer",
};

const SECTION_KEY_MAP: Record<string, SectionType> = {
  header: "header",
  hero: "hero",
  menu: "menu",
  about: "about",
  gallery: "gallery",
  location: "location_map",
  location_map: "location_map",
  services: "services",
  stats: "stats",
  testimonials: "testimonials",
  team: "team",
  reservation: "reservation",
  contact: "contact",
  footer: "footer",
};

/**
 * Parses a registry component id (`premium-hero-01`) into catalog metadata.
 */
export function parseGalleryComponentId(id: string): GalleryEntry | null {
  const parts = id.split("-");
  if (parts.length < 3) return null;

  const family = getFamilyFromComponentId(id);
  if (!family) return null;

  const variant = parts[parts.length - 1];
  if (!variant || !/^\d+$/.test(variant)) return null;

  const sectionKey = parts.slice(1, -1).join("-");
  const sectionType = SECTION_KEY_MAP[sectionKey];
  if (!sectionType) return null;

  const familyLabel = getPageFamilyLabel(family);
  const sectionLabel = GALLERY_SECTION_LABELS[sectionType];
  const label = `${familyLabel} ${sectionLabel} ${variant}`;

  return { id, family, sectionType, variant, label };
}

/**
 * Lists every registered section component as a catalog entry.
 * New registry keys appear automatically.
 */
export function listGalleryEntries(): GalleryEntry[] {
  return Object.keys(pageComponentRegistry)
    .map(parseGalleryComponentId)
    .filter((entry): entry is GalleryEntry => entry !== null)
    .sort(compareGalleryEntries);
}

/**
 * Filters catalog entries by family and/or section type.
 */
export function filterGalleryEntries(
  entries: GalleryEntry[],
  filters: GalleryFilters,
): GalleryEntry[] {
  return entries.filter((entry) => {
    if (filters.family !== "all" && entry.family !== filters.family) {
      return false;
    }
    if (
      filters.sectionType !== "all" &&
      entry.sectionType !== filters.sectionType
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Groups filtered entries by section type, omitting empty groups.
 */
export function groupGalleryEntries(
  entries: GalleryEntry[],
): GallerySectionGroup[] {
  const bySection = new Map<SectionType, GalleryEntry[]>();
  for (const sectionType of GALLERY_SECTION_ORDER) {
    bySection.set(sectionType, []);
  }
  for (const entry of entries) {
    const bucket = bySection.get(entry.sectionType);
    if (bucket) bucket.push(entry);
  }

  return GALLERY_SECTION_ORDER.flatMap((sectionType) => {
    const groupEntries = bySection.get(sectionType) ?? [];
    if (groupEntries.length === 0) return [];
    return [
      {
        sectionType,
        label: GALLERY_SECTION_LABELS[sectionType],
        entries: groupEntries,
      },
    ];
  });
}

/**
 * Builds the isolated preview URL for a component id.
 */
export function galleryPreviewUrl(componentId: string): string {
  return `/gallery.html?id=${encodeURIComponent(componentId)}`;
}

/**
 * Opens the full-bleed component preview in a new tab.
 */
export function openGalleryPreview(componentId: string): void {
  window.open(galleryPreviewUrl(componentId), "_blank", "noopener,noreferrer");
}

/**
 * Sorts entries by section, then family, then variant number.
 */
function compareGalleryEntries(a: GalleryEntry, b: GalleryEntry): number {
  const sectionDelta =
    GALLERY_SECTION_ORDER.indexOf(a.sectionType) -
    GALLERY_SECTION_ORDER.indexOf(b.sectionType);
  if (sectionDelta !== 0) return sectionDelta;

  const familyDelta =
    PAGE_FAMILIES.indexOf(a.family) - PAGE_FAMILIES.indexOf(b.family);
  if (familyDelta !== 0) return familyDelta;

  return Number(a.variant) - Number(b.variant);
}
