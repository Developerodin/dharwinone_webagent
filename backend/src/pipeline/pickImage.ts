import { loadCatalog, type CatalogEntry } from "../lib/catalog.js";
import {
  catalogFamilyFor,
  getDefaultPageFamily,
  type PageFamily,
} from "../config/pageFamily.js";
import type { SectionType } from "../schemas/page.schema.js";

const SECTION_TO_CATALOG: Partial<Record<SectionType, string>> = {
  hero: "hero",
  menu: "menu",
  about: "about",
  gallery: "gallery",
  // Reuse about/hero pools for team portraits, visit-us venue shots, and reservation banners
  team: "about",
  location_map: "about",
  reservation: "hero",
};

/**
 * Preferred orientation per section. About is portrait; hero/gallery landscape.
 */
const SECTION_ORIENTATION: Partial<
  Record<SectionType, "landscape" | "portrait" | "square">
> = {
  hero: "landscape",
  about: "portrait",
  menu: "square",
  gallery: "landscape",
  team: "portrait",
  // Visit-us media panel is ~5:4; prefer landscape about shots, fall back to any
  location_map: "landscape",
  reservation: "landscape",
};

/** Tags that are too generic to score cuisine relevance. */
const GENERIC_TAGS = new Set([
  "food",
  "restaurant",
  "hero",
  "about",
  "menu",
  "gallery",
  "premium",
  "elegant",
  "interior",
  "outdoor",
  "dining",
  "plated",
  "story",
  "chef",
  "patio",
  "indoor",
]);

/**
 * Returns the preferred catalog orientation for a section type.
 */
export function orientationForSection(
  sectionType: SectionType,
): "landscape" | "portrait" | "square" | undefined {
  return SECTION_ORIENTATION[sectionType];
}

/**
 * Tokenizes a cuisine/category string into lowercase tag-like tokens.
 */
export function cuisineTokens(category?: string | null): string[] {
  if (!category?.trim()) return [];
  const raw = category
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s/-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !GENERIC_TAGS.has(t));

  const aliases: Record<string, string[]> = {
    chinese: ["chinese", "asian"],
    japanese: ["japanese", "asian"],
    korean: ["korean", "asian"],
    thai: ["thai", "asian"],
    vietnamese: ["vietnamese", "asian"],
    indian: ["indian"],
    italian: ["italian", "european"],
    french: ["french", "european"],
    greek: ["greek", "european", "mediterranean"],
    spanish: ["spanish", "european", "mediterranean"],
    mediterranean: ["mediterranean", "european"],
    lebanese: ["lebanese", "middle-eastern"],
    turkish: ["turkish", "middle-eastern"],
    persian: ["persian", "middle-eastern"],
    arabian: ["arabian", "middle-eastern"],
    american: ["american"],
    barbecue: ["barbecue", "american"],
    bbq: ["barbecue", "american"],
    seafood: ["seafood"],
    vegan: ["vegan"],
    vegetarian: ["vegetarian"],
    fusion: ["fusion"],
    continental: ["continental"],
  };

  const out = new Set<string>();
  for (const token of raw) {
    out.add(token);
    const mapped = aliases[token];
    if (mapped) mapped.forEach((m) => out.add(m));
  }

  // Multi-word cues
  const joined = category.toLowerCase();
  if (joined.includes("south indian")) out.add("south-indian");
  if (joined.includes("north indian")) out.add("north-indian");
  if (joined.includes("middle eastern")) out.add("middle-eastern");
  if (joined.includes("pan asian")) out.add("pan-asian");
  if (joined.includes("tex mex") || joined.includes("tex-mex")) out.add("tex-mex");

  return [...out];
}

/**
 * Scores how well a catalog entry matches cuisine tokens.
 */
function cuisineScore(entry: CatalogEntry, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const tag of entry.tags) {
    const t = tag.toLowerCase();
    if (GENERIC_TAGS.has(t)) continue;
    if (tokens.includes(t)) score += 3;
    else if (tokens.some((token) => t.includes(token) || token.includes(t))) {
      score += 1;
    }
  }
  return score;
}

/**
 * Stable hash for rotating among top cuisine matches.
 */
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Sorts matches so cuisine-relevant images surface first.
 */
function rankByCuisine(entries: CatalogEntry[], category?: string | null): CatalogEntry[] {
  const tokens = cuisineTokens(category);
  if (tokens.length === 0) return entries;

  return [...entries].sort((a, b) => {
    const diff = cuisineScore(b, tokens) - cuisineScore(a, tokens);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Rotates into the top-N ranked matches so same cuisine ≠ same first image.
 */
function rotateMatches(
  entries: CatalogEntry[],
  seed?: string | null,
  windowSize = 6,
): CatalogEntry[] {
  if (entries.length <= 1 || !seed?.trim()) return entries;
  const tokens = cuisineTokens(seed);
  const topN = Math.min(windowSize, entries.length);
  // Prefer rotating among cuisine-scoring leaders when present.
  let window = entries.slice(0, topN);
  if (tokens.length > 0) {
    const best = cuisineScore(entries[0]!, tokens);
    const leaders = entries.filter((entry) => cuisineScore(entry, tokens) >= best);
    window = leaders.slice(0, Math.max(topN, 1));
  }
  const offset = stableHash(seed) % window.length;
  const rotatedWindow = [...window.slice(offset), ...window.slice(0, offset)];
  return [...rotatedWindow, ...entries.slice(window.length)];
}

/**
 * Filters catalog entries by section type, orientation, and page family.
 * Falls back by relaxing orientation, then family, so sections still get images.
 */
function filterCatalogEntries(args: {
  sectionType: SectionType;
  orientation?: "landscape" | "portrait" | "square";
  family?: PageFamily;
  category?: string | null;
  seed?: string | null;
}) {
  const catalogType = SECTION_TO_CATALOG[args.sectionType];
  if (!catalogType) return [];

  const family = catalogFamilyFor(args.family ?? getDefaultPageFamily());
  const catalog = loadCatalog();
  const rotateSeed = args.seed ?? args.category;

  const bySection = catalog.filter((entry) => entry.section_type === catalogType);

  const familyExact = bySection.filter((entry) => {
    const entryFamily = entry.family ?? "premium";
    if (entryFamily !== family) return false;
    if (args.orientation && entry.orientation !== args.orientation) return false;
    return true;
  });
  if (familyExact.length > 0) {
    return rotateMatches(rankByCuisine(familyExact, args.category), rotateSeed);
  }

  const familyAnyOrientation = bySection.filter((entry) => {
    const entryFamily = entry.family ?? "premium";
    return entryFamily === family;
  });
  if (familyAnyOrientation.length > 0) {
    return rotateMatches(
      rankByCuisine(familyAnyOrientation, args.category),
      rotateSeed,
    );
  }

  if (args.orientation) {
    const anyFamilyOriented = bySection.filter(
      (entry) => entry.orientation === args.orientation,
    );
    if (anyFamilyOriented.length > 0) {
      return rotateMatches(
        rankByCuisine(anyFamilyOriented, args.category),
        rotateSeed,
      );
    }
  }

  return rotateMatches(rankByCuisine(bySection, args.category), rotateSeed);
}

/**
 * Lists catalog image paths for a section/family (for cycling edits).
 */
export function listCatalogImagePaths(args: {
  sectionType: SectionType;
  family?: PageFamily;
  category?: string | null;
  seed?: string | null;
}): string[] {
  const matches = filterCatalogEntries({
    sectionType: args.sectionType,
    orientation: orientationForSection(args.sectionType),
    family: args.family,
    category: args.category,
    seed: args.seed ?? args.category,
  });
  const paths = matches.map((entry) => entry.path);
  return [...new Set(paths)];
}

/**
 * Stage 6 — pure code: filter catalog by section_type, pick first match.
 * Returns null when no catalog entry matches (caller may drop section).
 */
/**
 * Picks the first unused path from ranked matches, recording it in usedPaths.
 * When every candidate is already used, reuses the top match (exhaustion).
 */
function pickUnusedPath(
  paths: string[],
  usedPaths?: Set<string>,
): string | null {
  if (paths.length === 0) return null;
  if (!usedPaths) return paths[0] ?? null;

  const fresh = paths.find((path) => !usedPaths.has(path));
  const chosen = fresh ?? paths[0] ?? null;
  if (chosen) usedPaths.add(chosen);
  return chosen;
}

/**
 * Stage 6 — pure code: filter catalog by section_type, pick first unused match.
 * Returns null when no catalog entry matches (caller may drop section).
 */
export function pickImage(args: {
  sectionType: SectionType;
  orientation?: "landscape" | "portrait" | "square";
  family?: PageFamily;
  category?: string | null;
  seed?: string | null;
  /** Cross-section dedup set for a single page build/edit. */
  usedPaths?: Set<string>;
  /** Optional user-uploaded paths preferred over the catalog. */
  preferPaths?: string[];
}): string | null {
  if (args.preferPaths?.length) {
    const preferred = pickUnusedPath(args.preferPaths, args.usedPaths);
    if (preferred) return preferred;
  }

  const matches = filterCatalogEntries({
    ...args,
    seed: args.seed ?? args.category,
  });
  const paths = matches.map((entry) => entry.path);
  return pickUnusedPath(paths, args.usedPaths);
}

/**
 * Picks multiple gallery images up to a limit for the active family.
 */
export function pickGalleryImages(
  limit = 2,
  family: PageFamily = getDefaultPageFamily(),
  category?: string | null,
  seed?: string | null,
  usedPaths?: Set<string>,
  preferPaths?: string[],
): string[] {
  return pickSectionImages(
    "gallery",
    limit,
    family,
    category,
    seed,
    usedPaths,
    preferPaths,
  );
}

/**
 * Picks multiple catalog images for a logical section type / family.
 */
export function pickSectionImages(
  sectionType: SectionType,
  limit = 3,
  family: PageFamily = getDefaultPageFamily(),
  category?: string | null,
  seed?: string | null,
  usedPaths?: Set<string>,
  preferPaths?: string[],
): string[] {
  const unique: string[] = [];

  if (preferPaths?.length) {
    for (const path of preferPaths) {
      if (usedPaths?.has(path) || unique.includes(path)) continue;
      unique.push(path);
      usedPaths?.add(path);
      if (unique.length >= limit) return unique;
    }
  }

  const matches = filterCatalogEntries({
    sectionType,
    orientation: orientationForSection(sectionType),
    family,
    category,
    seed: seed ?? category,
  });

  for (const entry of matches) {
    if (unique.includes(entry.path)) continue;
    if (usedPaths?.has(entry.path)) continue;
    unique.push(entry.path);
    usedPaths?.add(entry.path);
    if (unique.length >= limit) break;
  }

  // Exhaustion: allow reuse only after all unique unused paths are taken.
  if (unique.length < limit) {
    for (const entry of matches) {
      if (unique.includes(entry.path)) continue;
      unique.push(entry.path);
      usedPaths?.add(entry.path);
      if (unique.length >= limit) break;
    }
  }

  return unique;
}
