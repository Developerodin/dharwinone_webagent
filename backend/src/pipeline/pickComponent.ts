import {
  getDefaultPageFamily,
  type PageFamily,
} from "../config/pageFamily.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { SectionType } from "../schemas/page.schema.js";

type VariantMap = Record<SectionType, readonly string[]>;

/**
 * Builds standard component id lists for a family.
 */
function familyVariants(
  family: PageFamily,
  heroCount: 2 | 3 = 2,
): VariantMap {
  const hero =
    heroCount === 3
      ? ([
          `${family}-hero-01`,
          `${family}-hero-02`,
          `${family}-hero-03`,
        ] as const)
      : ([`${family}-hero-01`, `${family}-hero-02`] as const);

  return {
    header: [
      `${family}-header-01`,
      `${family}-header-02`,
      `${family}-header-03`,
    ],
    hero,
    about: [`${family}-about-01`, `${family}-about-02`],
    services: [`${family}-services-01`, `${family}-services-02`],
    menu: [`${family}-menu-01`, `${family}-menu-02`],
    stats: [`${family}-stats-01`, `${family}-stats-02`],
    gallery: [`${family}-gallery-01`, `${family}-gallery-02`],
    testimonials: [
      `${family}-testimonials-01`,
      `${family}-testimonials-02`,
    ],
    team: [`${family}-team-01`, `${family}-team-02`],
    reservation: [
      `${family}-reservation-01`,
      `${family}-reservation-02`,
    ],
    location_map: [`${family}-location-01`, `${family}-location-02`],
    contact: [`${family}-contact-01`, `${family}-contact-02`],
    footer: [`${family}-footer-01`, `${family}-footer-02`],
  };
}

/** Available component ids per family and section type. */
export const COMPONENT_VARIANTS: Record<PageFamily, VariantMap> = {
  premium: familyVariants("premium", 3),
  elegant: familyVariants("elegant", 3),
  minimal: familyVariants("minimal", 2),
  rustic: familyVariants("rustic", 2),
  vibrant: familyVariants("vibrant", 2),
  bold: familyVariants("bold", 2),
};

/**
 * Extracts the numeric variant suffix from a component id (e.g. "02").
 */
export function getVariantSuffix(componentId: string): string {
  const match = /-(\d+)$/.exec(componentId);
  return match?.[1] ?? "01";
}

/**
 * Stable hash for deterministic variant picks across rebuilds.
 */
export function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Diversity points for a variant. Uses a non-sequential suffix salt so
 * "01"/"02"/"03" do not track consecutively under stableHash.
 */
function diversityScore(
  sectionType: string,
  businessName: string,
  suffix: string,
  modulus = 5,
): number {
  const salt =
    suffix === "01" ? "alpha" : suffix === "02" ? "bravo" : suffix === "03" ? "charlie" : suffix;
  return stableHash(`${sectionType}:${businessName}:${salt}`) % modulus;
}

/**
 * Builds scoring corpus from brief + chat including menu and location.
 */
function buildCorpus(brief?: Brief, chatText = ""): string {
  const menuBits =
    brief?.menuItems
      ?.map((item) => `${item.name} ${item.description ?? ""}`)
      .join(" ") ?? "";
  return `${brief?.category ?? ""} ${brief?.businessName ?? ""} ${brief?.address ?? ""} ${menuBits} ${chatText}`.toLowerCase();
}

/**
 * Tea / lounge cues only — category, name, chat (excludes menu + address).
 * Avoids “masala tea” menu items flipping header/hero variants.
 */
function buildTeaCueCorpus(brief?: Brief, chatText = ""): string {
  return `${brief?.category ?? ""} ${brief?.businessName ?? ""} ${chatText}`.toLowerCase();
}

/** Tea-house / lounge / afternoon-tea / chai signals (no bare menu “tea”). */
const TEA_REFINED_RE =
  /\b(tea[\s-]?house|tea[\s-]?room|afternoon[\s-]?tea|chai|lounge|refined[\s-]?caf[eé])\b/;

/**
 * Scores header variants from brief vibe signals.
 * Street/quick → 03; tea/lounge/refined cafe soft-boost 01/02 (not 03);
 * cafe|brunch alone no longer force header-03.
 */
function scoreHeaderVariant(
  suffix: string,
  corpus: string,
  teaCueCorpus: string,
  businessName: string,
): number {
  let score = 0;
  const fineDining =
    /\b(fine\s*dining|tasting|michelin|upscale|luxury|elegant|refined|candlelit)\b/.test(
      corpus,
    );
  const storyForward =
    /\b(story|heritage|family|tradition|history|chef|since|legacy)\b/.test(
      corpus,
    );
  const streetQuick =
    /\b(street\s*food|quick\s*service|counter\s*service|food\s*truck|taco|poke\s*bowl|takeout|grab[\s-]?and[\s-]?go)\b/.test(
      corpus,
    );
  const teaRefined = TEA_REFINED_RE.test(teaCueCorpus);

  if (suffix === "01" && fineDining) score += 6;
  if (suffix === "02" && storyForward) score += 6;
  if (suffix === "03" && streetQuick) score += 6;

  // Tea / lounge / refined cafe → soft boost 01 or 02 equally, never 03.
  if (teaRefined && !streetQuick) {
    if (suffix === "01" || suffix === "02") score += 3;
  }

  // Wider hash + mild anti-stick so 03 is not sticky for cafe-ish briefs.
  const spread = diversityScore("header", businessName, suffix, 5);
  score += spread;
  if (suffix === "03" && !streetQuick) score -= 1;

  return score;
}

/**
 * Scores variants using brief signals + business-seeded diversity.
 * Avoids unconditional *-02 bias for typical restaurant language.
 */
function scoreVariant(
  componentId: string,
  sectionType: SectionType,
  brief?: Brief,
  chatText = "",
): number {
  const suffix = getVariantSuffix(componentId);
  const corpus = buildCorpus(brief, chatText);
  const teaCueCorpus = buildTeaCueCorpus(brief, chatText);
  const businessName = brief?.businessName ?? "restaurant";
  let score = 0;

  if (sectionType === "header") {
    return scoreHeaderVariant(suffix, corpus, teaCueCorpus, businessName);
  }

  const photoHeavy =
    /\b(photo|gallery|visual|instagram|image|pictures?)\b/.test(corpus);
  const formForward =
    /\b(reserv|book|contact|form|inquiry|enquiry|table)\b/.test(corpus);
  const storyForward =
    /\b(story|heritage|family|tradition|history|chef|since)\b/.test(corpus);
  const menuFocus =
    /\b(tasting\s*menu|prix\s*fixe|signature\s*dishes)\b/.test(corpus);
  const teamForward = /\b(team|chef|staff|founder)\b/.test(corpus);
  const socialProof = /\b(review|testimonial|award|rated|stars?)\b/.test(corpus);
  const servicesFocus =
    /\b(catering|private\s*dining|events?|delivery|takeout|lunch\s*special)\b/.test(
      corpus,
    );
  const elegantOrTea =
    /\b(elegant|fine\s*dining|upscale)\b/.test(corpus) ||
    TEA_REFINED_RE.test(teaCueCorpus);

  if (suffix === "02") {
    if (sectionType === "hero" && photoHeavy && !elegantOrTea) score += 5;
    if (sectionType === "gallery" && photoHeavy) score += 5;
    if (sectionType === "contact" && formForward) score += 5;
    if (sectionType === "about" && storyForward) score += 5;
    if (sectionType === "menu" && menuFocus) score += 4;
    if (sectionType === "reservation" && formForward) score += 4;
    if (sectionType === "team" && teamForward) score += 4;
    if (sectionType === "testimonials" && socialProof) score += 4;
    if (sectionType === "services" && servicesFocus) score += 4;
    if (sectionType === "stats" && socialProof) score += 4;
    if (sectionType === "footer" && formForward) score += 2;
    if (sectionType === "location_map" && Boolean(brief?.address)) score += 2;
  }

  // photoHeavy → hero-03 only when not elegant/tea (those rely on diversity + recentSuffixes).
  if (suffix === "03" && sectionType === "hero" && photoHeavy && !elegantOrTea) {
    score += 6;
  }
  // Equal soft nudge for tea/elegant so hash + recentSuffixes diversify 01/02/03.
  if (sectionType === "hero" && elegantOrTea) {
    if (suffix === "01" || suffix === "02") score += 2;
  }

  if (suffix === "01") {
    if (sectionType === "hero" && !photoHeavy && !elegantOrTea) score += 2;
    if (sectionType === "about" && !storyForward) score += 2;
    if (sectionType === "menu" && !menuFocus) score += 2;
    if (sectionType === "services" && !servicesFocus) score += 2;
  }

  // Bold (Demo9) sunburst hero lives on *-01 — prefer it over the alt band.
  if (
    componentId.startsWith("bold-") &&
    sectionType === "hero" &&
    suffix === "01"
  ) {
    score += 8;
  }

  // Business-seeded mix so two similar restaurants diverge.
  score += diversityScore(sectionType, businessName, suffix, 5);

  return score;
}

export type PickComponentOptions = {
  preferComponentId?: string;
  brief?: Brief;
  chatText?: string;
  /** Previously chosen suffixes on this page — lightly penalize repeats. */
  recentSuffixes?: readonly string[];
};

/**
 * Stage 3 — section type + family → component id.
 * Prefers brief-aware scoring; theme remap preserves *-NN suffix.
 * Ties broken by stableHash(section:businessName:category).
 */
export function pickComponent(
  sectionType: SectionType,
  family: PageFamily = getDefaultPageFamily(),
  options?: PickComponentOptions,
): string {
  const variants = COMPONENT_VARIANTS[family][sectionType];

  if (options?.preferComponentId) {
    const suffix = getVariantSuffix(options.preferComponentId);
    const matched = variants.find((id) => id.endsWith(`-${suffix}`));
    return matched ?? variants[0]!;
  }

  const recent = options?.recentSuffixes ?? [];
  const scored = variants.map((id) => {
    let score = scoreVariant(id, sectionType, options?.brief, options?.chatText);
    const suffix = getVariantSuffix(id);
    const repeatCount = recent.filter((item) => item === suffix).length;
    if (repeatCount > 0) score -= repeatCount * 2;
    if (recent[recent.length - 1] === suffix) score -= 2;
    return { id, score };
  });

  const bestScore = Math.max(...scored.map((item) => item.score));
  const top = scored.filter((item) => item.score === bestScore);
  if (top.length === 1) return top[0]!.id;

  const seed = `${sectionType}:${options?.brief?.businessName ?? ""}:${options?.brief?.category ?? ""}`;
  const idx = stableHash(seed) % top.length;
  return top[idx]!.id;
}
