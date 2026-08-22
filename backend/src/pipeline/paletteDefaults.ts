import type { Brief } from "../schemas/brief.schema.js";
import type { CreativePalette } from "../schemas/creativeDirection.schema.js";
import { contrastForAccent, ensureAccentIsUsable } from "./colorResolve.js";
import { inventPaletteFromHoreca } from "./horecaDesignSystem.js";
import { stableHash } from "../lib/stableHash.js";

type PaletteCandidate = {
  label: string;
  accent: string;
  bg?: string;
  ink?: string;
};

/** Curated cuisine/vibe → palette candidates (deterministic pick by seed). */
const PALETTE_BUCKETS: Array<{
  re: RegExp;
  options: PaletteCandidate[];
}> = [
  {
    re: /\b(italian|trattoria|pizza|pasta|mediterranean)\b/i,
    options: [
      { label: "olive grove", accent: "#5c7a3a", bg: "#eef1e8", ink: "#222018" },
      { label: "wine cellar", accent: "#6b2d3c", bg: "#f3f0f4", ink: "#1a1214" },
      { label: "night trattoria", accent: "#d4a574", bg: "#1a1612", ink: "#f2ebe3" },
    ],
  },
  {
    re: /\b(sushi|japanese|omakase|ramen|korean)\b/i,
    options: [
      { label: "ink stone", accent: "#1a1a1a", bg: "#f5f5f3", ink: "#111111" },
      { label: "matcha", accent: "#4a6b4a", bg: "#f4f6f2", ink: "#1a1f1a" },
      { label: "indigo", accent: "#2c3e6b", bg: "#f3f4f8", ink: "#151822" },
    ],
  },
  {
    re: /\b(bbq|barbecue|smokehouse|steak|grill)\b/i,
    options: [
      { label: "ember rust", accent: "#9f6840", bg: "#f6efe6", ink: "#241c16" },
      { label: "charcoal fire", accent: "#c45c26", bg: "#1c1814", ink: "#f2ebe3" },
      { label: "hickory", accent: "#8b5a2b", bg: "#f5ede3", ink: "#1f1812" },
    ],
  },
  {
    re: /\b(cafe|coffee|brunch|bakery|bistro)\b/i,
    options: [
      { label: "espresso", accent: "#6b4226", bg: "#f4efe8", ink: "#1a1410" },
      { label: "slate cafe", accent: "#3d4a52", bg: "#eef1f3", ink: "#15181a" },
      { label: "cocoa night", accent: "#c4a484", bg: "#1c1612", ink: "#f3ebe3" },
    ],
  },
  {
    re: /\b(fine[\s-]?dining|upscale|michelin|luxury|elegant|tasting)\b/i,
    options: [
      { label: "gold charcoal", accent: "#c9a962", bg: "#121212", ink: "#f5f0e6" },
      { label: "champagne", accent: "#d4b896", bg: "#1a1814", ink: "#f7f2ea" },
      { label: "onyx gold", accent: "#b8954a", bg: "#0e0e0e", ink: "#efe8d8" },
    ],
  },
  {
    re: /\b(mexican|tex[\s-]?mex|taco|cantina)\b/i,
    options: [
      { label: "fiesta", accent: "#e85d04", bg: "#fff8f0", ink: "#1f1610" },
      { label: "agave", accent: "#2a9d8f", bg: "#f4faf8", ink: "#14201e" },
    ],
  },
  {
    re: /\b(indian|curry|tandoor|masala)\b/i,
    options: [
      { label: "saffron", accent: "#e09f3e", bg: "#fff8ef", ink: "#21180f" },
      { label: "marigold", accent: "#d97706", bg: "#faf6f0", ink: "#1c1510" },
      { label: "spice red", accent: "#c1121f", bg: "#fff5f2", ink: "#1f1212" },
    ],
  },
  {
    re: /\b(vegan|vegetarian|salad|healthy|organic)\b/i,
    options: [
      { label: "fresh leaf", accent: "#2d6a4f", bg: "#f4faf6", ink: "#14201a" },
      { label: "citrus", accent: "#84a98c", bg: "#f7faf7", ink: "#1a211c" },
    ],
  },
  {
    re: /\b(seafood|oyster|fish|coastal)\b/i,
    options: [
      { label: "ocean", accent: "#1d6a8a", bg: "#f2f7fa", ink: "#122028" },
      { label: "shell", accent: "#4a7c9b", bg: "#f5f8fb", ink: "#15202a" },
    ],
  },
];

const DEFAULT_PALETTE_OPTIONS: PaletteCandidate[] = [
  { label: "warm steel", accent: "#8fa0b5", bg: "#eef0f3", ink: "#1c1f24" },
  { label: "ink moss", accent: "#3d5a40", bg: "#eef2ee", ink: "#1a211c" },
  { label: "slate copper", accent: "#9f6840", bg: "#1c1814", ink: "#f2ebe3" },
];

/**
 * Parses a hex color into RGB 0–255.
 */
function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

/**
 * True when a background is the cream/beige AI-default surface.
 */
export function isCreamSurface(hex: string | undefined): boolean {
  if (!hex) return false;
  const rgb = parseRgb(hex);
  if (!rgb) return false;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 230 && min > 210 && r >= g && g >= b && r - b < 40;
}

/**
 * True when accent is terracotta/coral on a free axis (AI default #1).
 */
export function isTerracottaAccent(hex: string | undefined): boolean {
  if (!hex) return false;
  const rgb = parseRgb(hex);
  if (!rgb) return false;
  const { r, g, b } = rgb;
  return r > 160 && g > 50 && g < 140 && b < 80 && r > g + 40;
}

/**
 * True when palette matches Impeccable/SKILL.md AI-default looks.
 */
export function isGenericAiPalette(palette: {
  accent?: string;
  bg?: string;
}): boolean {
  if (isCreamSurface(palette.bg) && isTerracottaAccent(palette.accent)) return true;
  if (isCreamSurface(palette.bg)) return true;
  return false;
}

/**
 * Brief or chat asked for cream/terracotta — then the default is allowed.
 */
export function briefAllowsGenericLook(brief: Brief, chatText: string): boolean {
  const corpus = `${brief.category} ${(brief.brandColors ?? []).join(" ")} ${brief.vibe?.join(" ") ?? ""} ${chatText}`.toLowerCase();
  return /\b(cream|beige|terracotta|warm\s*paper|off[\s-]?white|#f4f1ea|#faf6f1)\b/.test(
    corpus,
  );
}

/**
 * Invents a palette from HoReCa cuisine catalog (preferred) or legacy buckets.
 * Skips cream/terracotta defaults unless the brief asked for them.
 */
export function inventPalette(
  brief: Brief,
  chatText: string,
  seed: string,
): CreativePalette {
  const corpus = `${brief.category}\n${brief.businessName}\n${chatText}`;
  const allowGeneric = briefAllowsGenericLook(brief, chatText);
  const fromHoreca = inventPaletteFromHoreca(corpus, seed);
  if (fromHoreca && (allowGeneric || !isGenericAiPalette(fromHoreca))) {
    return fromHoreca;
  }

  let options = DEFAULT_PALETTE_OPTIONS;
  for (const bucket of PALETTE_BUCKETS) {
    if (bucket.re.test(corpus)) {
      options = bucket.options;
      break;
    }
  }
  if (!allowGeneric) {
    const filtered = options.filter((option) => !isGenericAiPalette(option));
    if (filtered.length > 0) options = filtered;
  }

  const pick = options[stableHash(seed) % options.length] ?? options[0]!;
  const accent = ensureAccentIsUsable(pick.accent);
  return {
    accent,
    accentContrast: contrastForAccent(accent),
    bg: pick.bg,
    ink: pick.ink,
  };
}
