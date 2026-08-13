import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  getDefaultPageFamily,
  type PageFamily,
} from "../config/pageFamily.js";
import { getModelFor, getOpenAIClient } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import {
  archetypeSchema,
  narrativeSchema,
  sectionPlanItemSchema,
  type Archetype,
  type CreativeDirection,
  type CreativePalette,
  type SectionPlanItem,
} from "../schemas/creativeDirection.schema.js";
import type { Page, SectionType } from "../schemas/page.schema.js";
import {
  contrastForAccent,
  deriveSurfaceTokens,
  luminance,
  resolveColor,
} from "./colorResolve.js";
import {
  buildFixtureNarrative,
  buildFixtureSectionPlan,
  fetchCreativeDirectionLlm,
  inferArchetype,
} from "./creativeDirectionLlm.js";
import { inventPaletteFromHoreca } from "./horecaDesignSystem.js";
import { inferPageFamily } from "./inferPageFamily.js";
import { COMPONENT_VARIANTS, stableHash } from "./pickComponent.js";

/** Sections that get explicit variant hints from Creative Director. */
const HINT_SECTIONS: SectionType[] = [
  "header",
  "hero",
  "about",
  "menu",
  "gallery",
  "reservation",
  "contact",
  "footer",
];

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
      { label: "warm tomato", accent: "#c23b22", bg: "#faf6f1", ink: "#1f1a17" },
      { label: "olive grove", accent: "#5c7a3a", bg: "#f7f4ec", ink: "#222018" },
      { label: "terracotta", accent: "#c45c26", bg: "#f8f1ea", ink: "#2a211c" },
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
      { label: "coral cream", accent: "#ff684c", bg: "#fff8f4", ink: "#1f1916" },
      { label: "espresso", accent: "#6b4226", bg: "#faf6f1", ink: "#1a1410" },
      { label: "latte", accent: "#c4a484", bg: "#fbf7f2", ink: "#2a221c" },
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
  { label: "warm steel", accent: "#8fa0b5", bg: "#f6f5f2", ink: "#1c1f24" },
  { label: "soft coral", accent: "#ff684c", bg: "#fff8f5", ink: "#1f1916" },
  { label: "forest", accent: "#3d5a40", bg: "#f5f7f4", ink: "#1a211c" },
];

/**
 * Builds a stable creative seed string from brief + family.
 */
export function buildCreativeSeed(
  brief: Brief,
  family: PageFamily,
): string {
  const colors = (brief.brandColors ?? []).join(",");
  return [
    brief.businessName.trim().toLowerCase(),
    brief.category.trim().toLowerCase(),
    colors,
    family,
  ].join("|");
}

/**
 * Builds a CreativePalette from client brand color strings.
 */
export function paletteFromBrandColors(
  brandColors: string[] | null | undefined,
): CreativePalette | null {
  if (!brandColors?.length) return null;
  const accent = resolveColor(brandColors[0] ?? "");
  if (!accent) return null;

  const palette: CreativePalette = {
    accent,
    accentContrast: contrastForAccent(accent),
  };
  if (brandColors[1]) {
    const bg = resolveColor(brandColors[1]);
    if (bg) palette.bg = bg;
  }
  if (brandColors[2]) {
    const ink = resolveColor(brandColors[2]);
    if (ink) palette.ink = ink;
  }
  return palette;
}

/**
 * Invents a palette from HoReCa cuisine catalog (preferred) or legacy buckets.
 */
export function inventPalette(
  brief: Brief,
  chatText: string,
  seed: string,
): CreativePalette {
  const corpus = `${brief.category}\n${brief.businessName}\n${chatText}`;
  const fromHoreca = inventPaletteFromHoreca(corpus, seed);
  if (fromHoreca) return fromHoreca;

  let options = DEFAULT_PALETTE_OPTIONS;
  for (const bucket of PALETTE_BUCKETS) {
    if (bucket.re.test(corpus)) {
      options = bucket.options;
      break;
    }
  }

  const pick = options[stableHash(seed) % options.length] ?? options[0]!;
  return {
    accent: pick.accent,
    accentContrast: contrastForAccent(pick.accent),
    bg: pick.bg,
    ink: pick.ink,
  };
}

/**
 * Picks single-family component ids for key sections from the seed.
 */
export function buildSectionVariantHints(
  family: PageFamily,
  seed: string,
): Record<string, string> {
  const hints: Record<string, string> = {};
  const recentSuffixes: string[] = [];

  for (const section of HINT_SECTIONS) {
    const variants = COMPONENT_VARIANTS[family][section];
    if (!variants.length) continue;

    let idx = stableHash(`${seed}:${section}`) % variants.length;
    // Light anti-stick: avoid repeating the last suffix when alternatives exist
    if (variants.length > 1 && recentSuffixes.length > 0) {
      const last = recentSuffixes[recentSuffixes.length - 1];
      const candidate = variants[idx]!;
      if (candidate.endsWith(`-${last}`)) {
        idx = (idx + 1) % variants.length;
      }
    }

    const id = variants[idx]!;
    hints[section] = id;
    const suffix = id.match(/-(\d+)$/)?.[1] ?? "01";
    recentSuffixes.push(suffix);
    if (recentSuffixes.length > 3) recentSuffixes.shift();
  }

  return hints;
}

/**
 * Applies a creative palette onto page.themeOverrides.
 */
export function applyCreativePalette(
  page: Page,
  palette: CreativePalette | null,
): void {
  if (!palette) return;
  const next = {
    ...(page.themeOverrides ?? {}),
    accent: palette.accent,
    accentContrast: palette.accentContrast,
    ...(palette.bg ? { bg: palette.bg } : {}),
    ...(palette.bgAlt ? { bgAlt: palette.bgAlt } : {}),
    ...(palette.ink ? { ink: palette.ink } : {}),
    ...(palette.fontDisplay ? { fontDisplay: palette.fontDisplay } : {}),
    ...(palette.fontBody ? { fontBody: palette.fontBody } : {}),
  };
  const surfaces = deriveSurfaceTokens({
    bg: next.bg,
    ink: next.ink,
    bgAlt: next.bgAlt,
  });
  if (surfaces) {
    next.bgDark = surfaces.bgDark;
    next.card = surfaces.card;
    next.muted = surfaces.muted;
    next.onDark = surfaces.onDark;
    if (!next.bgAlt && surfaces.bgAlt) next.bgAlt = surfaces.bgAlt;
  }
  // Guard: never leave light ink on light bg (or dark on dark)
  if (next.bg && next.ink) {
    const bgLight = luminance(next.bg) > 0.55;
    const inkLight = luminance(next.ink) > 0.55;
    if (bgLight === inkLight) {
      next.ink = bgLight ? "#1a1512" : "#f5f0e8";
      const fixed = deriveSurfaceTokens({
        bg: next.bg,
        ink: next.ink,
        bgAlt: next.bgAlt,
      });
      if (fixed) {
        next.muted = fixed.muted;
        next.onDark = fixed.onDark;
        next.bgDark = fixed.bgDark;
        next.card = fixed.card;
      }
    }
  }
  page.themeOverrides = next;
}

/**
 * Deterministic Creative Director core (palette/seed/hints + fixture archetype).
 */
export function runCreativeDirectorSync(args: {
  brief: Brief;
  chatText: string;
  family?: PageFamily;
}): CreativeDirection {
  const family =
    args.family ??
    inferPageFamily(args.brief, args.chatText) ??
    getDefaultPageFamily();

  const seed = buildCreativeSeed(args.brief, family);

  const fromBrand = paletteFromBrandColors(args.brief.brandColors);
  let palette: CreativePalette | null;
  let paletteSource: CreativeDirection["paletteSource"];

  if (fromBrand) {
    palette = fromBrand;
    paletteSource = "client_brand";
  } else {
    palette = inventPalette(args.brief, args.chatText, seed);
    paletteSource = "creative_pick";
  }

  const sectionVariantHints = buildSectionVariantHints(family, seed);
  const heroHint = sectionVariantHints.hero ?? `${family}-hero-01`;
  const heroSuffix = heroHint.match(/-(\d+)$/)?.[1] ?? "01";
  const accentLabel = palette.accent;

  const archetype = inferArchetype(args.brief, args.chatText);
  const sectionPlan = buildFixtureSectionPlan(
    args.brief,
    args.chatText,
    archetype,
  );
  const narrative = buildFixtureNarrative(args.brief);

  const rationale =
    paletteSource === "client_brand"
      ? `Direction set — ${family} · ${archetype} · client brand ${accentLabel} · hero-${heroSuffix}`
      : `Direction set — ${family} · ${archetype} · creative pick ${accentLabel} · hero-${heroSuffix}`;

  return {
    family,
    seed,
    palette,
    paletteSource,
    sectionVariantHints,
    rationale,
    archetype,
    sectionPlan,
    narrative,
  };
}

/**
 * Creative Director — hash palette/seed plus optional LLM archetype/plan/narrative.
 */
export async function runCreativeDirector(args: {
  brief: Brief;
  chatText: string;
  family?: PageFamily;
  useFixture?: boolean;
}): Promise<CreativeDirection> {
  const base = runCreativeDirectorSync(args);
  if (args.useFixture) return base;

  const llm = await fetchCreativeDirectionLlm({
    brief: args.brief,
    chatText: args.chatText,
    family: base.family,
  });
  if (!llm) return base;

  return {
    ...base,
    archetype: llm.archetype,
    sectionPlan: llm.sectionPlan,
    narrative: llm.narrative,
    rationale: llm.rationale || base.rationale,
  };
}
