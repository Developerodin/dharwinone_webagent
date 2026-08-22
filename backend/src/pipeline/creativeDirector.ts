import {
  getDefaultPageFamily,
  type PageFamily,
} from "../config/pageFamily.js";
import type { Brief } from "../schemas/brief.schema.js";
import type {
  CreativeDirection,
  CreativePalette,
  DesignSystemSpec,
} from "../schemas/creativeDirection.schema.js";
import type { Page, SectionType } from "../schemas/page.schema.js";
import {
  contrastForAccent,
  deriveSurfaceTokens,
  ensureAccentIsUsable,
  luminance,
  resolveColor,
} from "./colorResolve.js";
import {
  applySignatureToSectionPlan,
  buildFixtureNarrative,
  buildFixtureSectionPlan,
  buildFixtureSignature,
  buildFixtureSubject,
  fetchCreativeDirectionLlm,
  inferArchetype,
  inferMode,
} from "./creativeDirectionLlm.js";
import {
  fontStackFor,
  getTypePairById,
  pickTypePairForSeed,
} from "./horecaDesignSystem.js";
import { inferPageFamily } from "./inferPageFamily.js";
import {
  briefAllowsGenericLook,
  inventPalette,
  isGenericAiPalette,
} from "./paletteDefaults.js";
import { stableHash } from "../lib/stableHash.js";
import { findCandidates } from "../catalog/index.js";
import {
  buildSectionRhythm,
  densityFor,
  typeScaleFor,
} from "./sectionRhythm.js";

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
  const resolved = resolveColor(brandColors[0] ?? "");
  if (!resolved) return null;
  // Keep the brand hue; nudge lightness only if no ink can sit on it legibly.
  const accent = ensureAccentIsUsable(resolved);

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
 * Picks single-family component ids for key sections from the seed.
 * Signature section prefers a non-01 variant when alternatives exist.
 */
export function buildSectionVariantHints(
  family: PageFamily,
  seed: string,
  signatureSection?: SectionType,
): Record<string, string> {
  const hints: Record<string, string> = {};
  const recentSuffixes: string[] = [];

  for (const section of HINT_SECTIONS) {
    const variants = findCandidates({ section, family })
      .map((spec) => spec.id)
      .sort();
    if (!variants.length) continue;

    let idx = stableHash(`${seed}:${section}`) % variants.length;
    if (signatureSection === section && variants.length > 1) {
      idx = (stableHash(`${seed}:${section}:sig`) % (variants.length - 1)) + 1;
    }
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
  /** Surface programs least used by comparable sites, least-used first. */
  preferredPrograms?: readonly string[];
}): CreativeDirection {
  const family =
    args.family ??
    inferPageFamily(args.brief, args.chatText) ??
    getDefaultPageFamily();

  const seed = buildCreativeSeed(args.brief, family);

  const fromBrand = paletteFromBrandColors(args.brief.brandColors);
  let palette: CreativePalette;
  let paletteSource: CreativeDirection["paletteSource"];

  if (fromBrand) {
    palette = fromBrand;
    paletteSource = "client_brand";
  } else {
    palette = inventPalette(args.brief, args.chatText, seed);
    paletteSource = "creative_pick";
  }

  const archetype = inferArchetype(args.brief, args.chatText);
  const signature = buildFixtureSignature(args.brief, archetype);
  const sectionVariantHints = buildSectionVariantHints(
    family,
    seed,
    signature.section,
  );
  const heroHint = sectionVariantHints.hero ?? `${family}-hero-01`;
  const heroSuffix = heroHint.match(/-(\d+)$/)?.[1] ?? "01";
  const accentLabel = palette.accent;

  const density = densityFor(args.brief.priceBand, args.brief.vibe);
  const designSystem: DesignSystemSpec = {
    density,
    typeScale: typeScaleFor(density, args.brief.priceBand),
  };

  const sectionPlan = buildSectionRhythm({
    sectionTypes: buildFixtureSectionPlan(args.brief, args.chatText, archetype).map(
      (item) => item.type,
    ),
    seed,
    density,
    signatureSection: signature.section,
    preferredPrograms: args.preferredPrograms,
  });
  const narrative = buildFixtureNarrative(args.brief);
  const subject = buildFixtureSubject(args.brief);
  const mode = inferMode(archetype, args.brief, args.chatText);

  // Typography is a design decision, not an optional LLM extra — resolve one
  // deterministically so every build has real type even when the LLM is absent.
  const typePair = pickTypePairForSeed(seed, args.brief.category, args.chatText);
  if (typePair) {
    palette = {
      ...palette,
      fontDisplay: fontStackFor(typePair.headingFont) ?? palette.fontDisplay,
      fontBody: fontStackFor(typePair.bodyFont) ?? palette.fontBody,
    };
  }

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
    mode,
    subject,
    signature,
    designSystem,
    typePairId: typePair?.id,
  };
}

/**
 * Applies a type pair's fonts onto a creative palette.
 */
function applyTypePair(
  palette: CreativePalette,
  typePairId: string | undefined,
): CreativePalette {
  if (!typePairId) return palette;
  const pair = getTypePairById(typePairId);
  if (!pair) return palette;
  return {
    ...palette,
    fontDisplay: fontStackFor(pair.headingFont) ?? palette.fontDisplay,
    fontBody: fontStackFor(pair.bodyFont) ?? palette.fontBody,
  };
}

/**
 * Builds a CreativePalette from LLM hexes; returns null if accent will not parse.
 */
function paletteFromLlmPick(
  pick: { accent: string; bg?: string; bgAlt?: string; ink?: string },
  brief: Brief,
  chatText: string,
): CreativePalette | null {
  const parsed = resolveColor(pick.accent) ?? (/^#[0-9a-f]{6}$/i.test(pick.accent) ? pick.accent : null);
  if (!parsed) return null;
  const accent = ensureAccentIsUsable(parsed);
  const bg = pick.bg ? resolveColor(pick.bg) ?? pick.bg : undefined;
  const ink = pick.ink ? resolveColor(pick.ink) ?? pick.ink : undefined;
  const bgAlt = pick.bgAlt ? resolveColor(pick.bgAlt) ?? pick.bgAlt : undefined;
  const next: CreativePalette = {
    accent,
    accentContrast: contrastForAccent(accent),
    ...(bg ? { bg } : {}),
    ...(ink ? { ink } : {}),
    ...(bgAlt ? { bgAlt } : {}),
  };
  if (!briefAllowsGenericLook(brief, chatText) && isGenericAiPalette(next)) {
    return null;
  }
  return next;
}

/**
 * Creative Director — hash palette/seed plus optional LLM direction (palette/type win).
 */
export async function runCreativeDirector(args: {
  brief: Brief;
  chatText: string;
  family?: PageFamily;
  useFixture?: boolean;
  preferredPrograms?: readonly string[];
}): Promise<CreativeDirection> {
  const base = runCreativeDirectorSync(args);
  if (args.useFixture) return base;

  const llm = await fetchCreativeDirectionLlm({
    brief: args.brief,
    chatText: args.chatText,
    family: base.family,
  });
  if (!llm) return base;

  let palette = base.palette;
  let paletteSource = base.paletteSource;
  if (base.paletteSource !== "client_brand" && llm.palette) {
    const fromLlm = paletteFromLlmPick(llm.palette, args.brief, args.chatText);
    if (fromLlm) {
      palette = applyTypePair(fromLlm, llm.typePairId);
      paletteSource = "creative_pick";
    }
  } else if (palette && llm.typePairId) {
    palette = applyTypePair(palette, llm.typePairId);
  }

  const signature = llm.signature ?? base.signature;
  // Keep the model's ordering and any non-flat surface work it did, but run it
  // through the same rhythm rules so a flat or repetitive plan gets repaired.
  const sectionPlan = applySignatureToSectionPlan(
    buildSectionRhythm({
      sectionTypes: llm.sectionPlan.map((item) => item.type),
      seed: base.seed,
      density: base.designSystem?.density ?? "normal",
      signatureSection: signature?.section ?? null,
      existing: llm.sectionPlan,
      preferredPrograms: args.preferredPrograms,
    }),
    signature ?? buildFixtureSignature(args.brief, llm.archetype),
  );
  const sectionVariantHints = signature
    ? buildSectionVariantHints(base.family, base.seed, signature.section)
    : base.sectionVariantHints;

  return {
    ...base,
    palette,
    paletteSource,
    archetype: llm.archetype,
    sectionPlan,
    narrative: llm.narrative,
    rationale: llm.rationale || base.rationale,
    mode: llm.mode ?? base.mode,
    subject: llm.subject ?? base.subject,
    signature,
    typePairId: llm.typePairId ?? base.typePairId,
    sectionVariantHints,
  };
}

export {
  briefAllowsGenericLook,
  inventPalette,
  isCreamSurface,
  isGenericAiPalette,
  isTerracottaAccent,
} from "./paletteDefaults.js";
