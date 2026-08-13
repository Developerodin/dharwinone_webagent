import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PageFamily } from "../config/pageFamily.js";
import type { CreativePalette } from "../schemas/creativeDirection.schema.js";
import type { ThemeOverrides } from "../schemas/page.schema.js";
import {
  contrastForAccent,
  deriveSurfaceTokens,
  luminance,
} from "./colorResolve.js";
import { stableHash } from "./pickComponent.js";

export type HorecaPalette = {
  id: string;
  name: string;
  mood: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

export type HorecaTypePair = {
  id: string;
  headingFont: string;
  bodyFont: string;
  label: string;
  mood: string;
};

export type HorecaCuisineVariant = {
  name: string;
  headingFont: string | null;
  bodyFont: string | null;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  note: string;
};

export type HorecaCuisine = {
  id: string;
  name: string;
  kind: string;
  variants: HorecaCuisineVariant[];
  subs: Array<{
    name: string;
    fonts?: string;
    note?: string;
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    headingFont?: string | null;
    bodyFont?: string | null;
  }>;
};

export type HorecaDesignSystem = {
  source: string;
  version: number;
  roles: Record<string, string>;
  componentGuidance: {
    lightSection: Record<string, unknown>;
    darkSection: Record<string, unknown>;
    bySection: Record<string, string>;
  };
  contrastRules: string[];
  familyDefaults: Record<
    string,
    { paletteId: string; typePairId: string; surfaceMode: "light" | "dark" }
  >;
  palettes: HorecaPalette[];
  typePairs: HorecaTypePair[];
  cuisines: HorecaCuisine[];
  generationRules: string[];
};

let cached: HorecaDesignSystem | null = null;

/**
 * Loads the HoReCa typography/colour catalog (JSON, DB-ready shape).
 */
export function getHorecaDesignSystem(): HorecaDesignSystem {
  if (cached) return cached;
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "../../data/horecaDesignSystem.json");
  cached = JSON.parse(readFileSync(path, "utf8")) as HorecaDesignSystem;
  return cached;
}

/**
 * Builds a CSS font-family stack for a Google Font name from the catalog.
 */
export function fontStackFor(fontName: string | null | undefined): string | undefined {
  if (!fontName?.trim()) return undefined;
  const name = fontName.trim();
  const fallback = /serif|garamond|playfair|fraunces|lora|cormorant|bodoni|cinzel|marcellus|spectral|yeseva|bitter/i.test(
    name,
  )
    ? "Georgia, serif"
    : "system-ui, sans-serif";
  return `"${name}", ${fallback}`;
}

export type HorecaCuisineSub = HorecaCuisine["subs"][number] & {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  headingFont?: string | null;
  bodyFont?: string | null;
};

export type HorecaCuisineHit = {
  cuisine: HorecaCuisine;
  sub: HorecaCuisineSub | null;
  score: number;
};

/**
 * Finds best cuisine or sub-cuisine match against brief corpus.
 */
export function findCuisineMatch(corpus: string): HorecaCuisineHit | null {
  const system = getHorecaDesignSystem();
  const lower = corpus.toLowerCase();
  let best: HorecaCuisineHit | null = null;

  /**
   * Records a candidate if it beats the current best score.
   */
  function consider(
    cuisine: HorecaCuisine,
    sub: HorecaCuisineSub | null,
    score: number,
  ): void {
    if (score <= 0) return;
    if (!best || score > best.score) best = { cuisine, sub, score };
  }

  for (const cuisine of system.cuisines) {
    const name = cuisine.name.toLowerCase();
    if (name.length >= 3 && lower.includes(name)) {
      consider(cuisine, null, 10 + name.length);
    }
    for (const sub of cuisine.subs as HorecaCuisineSub[]) {
      const sn = sub.name.toLowerCase();
      if (sn.length >= 3 && lower.includes(sn)) {
        consider(cuisine, sub, 14 + sn.length);
      }
    }
  }

  // Alias boosts when plain names are absent
  if (/\b(pizza|pasta|trattoria)\b/.test(lower)) {
    const european = system.cuisines.find((c) => c.id === "european");
    const italian = european?.subs.find((s) =>
      s.name.toLowerCase().includes("italian"),
    ) as HorecaCuisineSub | undefined;
    if (european && italian) consider(european, italian, 16);
  }
  if (/\b(sushi|ramen|omakase)\b/.test(lower)) {
    const asian = system.cuisines.find((c) => c.id === "asian");
    const japanese = asian?.subs.find((s) =>
      s.name.toLowerCase().includes("japanese"),
    ) as HorecaCuisineSub | undefined;
    if (asian && japanese) consider(asian, japanese, 16);
  }
  if (/\b(taco|tex[\s-]?mex|cantina)\b/.test(lower)) {
    const american = system.cuisines.find((c) => c.id === "american");
    if (american) consider(american, null, 12);
  }
  if (/\b(chinese|dim\s*sum|szechuan|sichuan)\b/.test(lower)) {
    const asian = system.cuisines.find((c) => c.id === "asian");
    const chinese = asian?.subs.find((s) =>
      s.name.toLowerCase().includes("chinese"),
    ) as HorecaCuisineSub | undefined;
    if (asian && chinese) consider(asian, chinese, 16);
  }

  return best;
}

/**
 * Picks a cuisine variant (1 or 2) from seed, or synthesizes from a sub.
 */
export function pickCuisineVariant(
  hit: HorecaCuisineHit,
  seed: string,
): HorecaCuisineVariant | null {
  if (hit.sub?.primary && hit.sub.background && hit.sub.text) {
    return {
      name: hit.sub.name,
      headingFont: hit.sub.headingFont ?? null,
      bodyFont: hit.sub.bodyFont ?? null,
      primary: hit.sub.primary,
      secondary: hit.sub.secondary ?? hit.sub.accent ?? hit.sub.primary,
      accent: hit.sub.accent ?? hit.sub.secondary ?? hit.sub.primary,
      background: hit.sub.background,
      text: hit.sub.text,
      note: hit.sub.note ?? "",
    };
  }
  const { cuisine } = hit;
  if (!cuisine.variants.length) return null;
  const idx = stableHash(`${seed}:horeca-variant`) % cuisine.variants.length;
  return cuisine.variants[idx] ?? cuisine.variants[0] ?? null;
}

/**
 * Maps a 5-token HoReCa palette onto CreativePalette (+ optional fonts).
 */
export function creativePaletteFromHoreca(args: {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  headingFont?: string | null;
  bodyFont?: string | null;
}): CreativePalette & { fontDisplay?: string; fontBody?: string } {
  const accent = args.accent || args.secondary || args.primary;
  return {
    accent,
    accentContrast: contrastForAccent(accent),
    bg: args.background,
    bgAlt: args.secondary,
    ink: args.text,
    ...(fontStackFor(args.headingFont)
      ? { fontDisplay: fontStackFor(args.headingFont) }
      : {}),
    ...(fontStackFor(args.bodyFont)
      ? { fontBody: fontStackFor(args.bodyFont) }
      : {}),
  };
}

/**
 * Resolves family default tokens from the HoReCa catalog for theme switches.
 * Respects light/dark surface mode so ink never lands white-on-cream.
 */
export function themeOverridesForFamily(family: PageFamily): ThemeOverrides {
  const system = getHorecaDesignSystem();
  const def = system.familyDefaults[family] ?? system.familyDefaults.premium;
  const palette =
    system.palettes.find((p) => p.id === def?.paletteId) ??
    system.palettes[0]!;
  const typePair = system.typePairs.find((p) => p.id === def?.typePairId);

  const mode = def?.surfaceMode ?? "light";
  let bg = palette.background;
  let ink = palette.text;
  let accent = palette.accent || palette.secondary;
  let bgAlt = palette.secondary;

  if (mode === "dark") {
    // Dark families: canvas from primary/background (whichever is darker)
    const primaryDarker =
      luminance(palette.primary) <= luminance(palette.background);
    bg = primaryDarker ? palette.primary : palette.background;
    ink =
      luminance(bg) > 0.55
        ? palette.text
        : luminance(palette.text) > 0.55
          ? palette.text
          : palette.background;
    accent = palette.secondary || palette.accent;
    bgAlt = palette.accent || palette.primary;
  } else {
    // Light families: force readable dark ink on light bg
    if (luminance(bg) > 0.55 && luminance(ink) > 0.55) {
      ink = palette.primary;
    }
    if (luminance(bg) <= 0.55 && luminance(ink) <= 0.55) {
      ink = "#f5f0e8";
    }
    accent = palette.accent || palette.primary;
  }

  const overrides: ThemeOverrides = {
    accent,
    accentContrast: contrastForAccent(accent),
    bg,
    bgAlt,
    ink,
    fontDisplay: fontStackFor(typePair?.headingFont),
    fontBody: fontStackFor(typePair?.bodyFont),
  };

  const surfaces = deriveSurfaceTokens({
    bg: overrides.bg,
    ink: overrides.ink,
    bgAlt: overrides.bgAlt,
  });
  if (surfaces) {
    overrides.bgDark = surfaces.bgDark;
    overrides.card = surfaces.card;
    overrides.muted = surfaces.muted;
    overrides.onDark = surfaces.onDark;
    if (!overrides.bgAlt && surfaces.bgAlt) overrides.bgAlt = surfaces.bgAlt;
  }

  // Final contrast guard
  if (overrides.bg && overrides.ink) {
    const bgLight = luminance(overrides.bg) > 0.55;
    const inkLight = luminance(overrides.ink) > 0.55;
    if (bgLight === inkLight) {
      overrides.ink = bgLight ? "#1a1512" : "#f5f0e8";
      const again = deriveSurfaceTokens({
        bg: overrides.bg,
        ink: overrides.ink,
        bgAlt: overrides.bgAlt,
      });
      if (again) {
        overrides.muted = again.muted;
        overrides.onDark = again.onDark;
        overrides.bgDark = again.bgDark;
        overrides.card = again.card;
      }
    }
  }

  return overrides;
}

/**
 * Invents a CreativePalette from HoReCa cuisine mappings (seeded variant).
 */
export function inventPaletteFromHoreca(
  corpus: string,
  seed: string,
): (CreativePalette & { fontDisplay?: string; fontBody?: string }) | null {
  const hit = findCuisineMatch(corpus);
  if (!hit) return null;
  const variant = pickCuisineVariant(hit, seed);
  if (!variant) return null;
  return creativePaletteFromHoreca(variant);
}

/**
 * Looks up a named palette archetype by id or name.
 */
export function getPaletteById(id: string): HorecaPalette | null {
  const system = getHorecaDesignSystem();
  return (
    system.palettes.find(
      (p) => p.id === id || p.name.toLowerCase() === id.toLowerCase(),
    ) ?? null
  );
}
