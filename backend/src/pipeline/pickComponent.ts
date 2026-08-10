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
    header: [`${family}-header-01`],
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
 * Scores variants using brief signals (no free +1 for *-01).
 */
function scoreVariant(
  componentId: string,
  sectionType: SectionType,
  brief?: Brief,
  chatText = "",
): number {
  const suffix = getVariantSuffix(componentId);
  const corpus = buildCorpus(brief, chatText);
  let score = 0;

  const photoHeavy =
    /\b(photo|gallery|visual|instagram|image|pictures?)\b/.test(corpus);
  const formForward =
    /\b(reserv|book|contact|form|inquiry|enquiry|table)\b/.test(corpus);
  const storyForward =
    /\b(story|heritage|family|tradition|history|chef|since)\b/.test(corpus);
  const menuFocus =
    /\b(menu|dishes|food|cuisine)\b/.test(corpus) ||
    (brief?.menuItems?.length ?? 0) > 0;
  const teamForward = /\b(team|chef|staff|founder)\b/.test(corpus);
  const socialProof = /\b(review|testimonial|award|rated|stars?)\b/.test(corpus);

  if (suffix === "02") {
    if (sectionType === "hero" && photoHeavy) score += 3;
    if (sectionType === "gallery" && photoHeavy) score += 3;
    if (sectionType === "contact" && formForward) score += 3;
    if (sectionType === "about" && storyForward) score += 3;
    if (sectionType === "menu" && menuFocus) score += 2;
    if (sectionType === "reservation" && formForward) score += 3;
    if (sectionType === "team" && teamForward) score += 2;
    if (sectionType === "testimonials" && socialProof) score += 2;
    if (sectionType === "services") score += 1;
    if (sectionType === "stats" && socialProof) score += 2;
    if (sectionType === "footer" && formForward) score += 1;
    if (sectionType === "location_map" && Boolean(brief?.address)) score += 2;
  }

  if (suffix === "03" && sectionType === "hero" && photoHeavy) {
    score += 4;
  }

  if (suffix === "01") {
    if (sectionType === "hero" && !photoHeavy) score += 1;
    if (sectionType === "about" && !storyForward) score += 1;
  }

  return score;
}

export type PickComponentOptions = {
  preferComponentId?: string;
  brief?: Brief;
  chatText?: string;
};

/**
 * Stage 3 — section type + family → component id.
 * Prefers brief-aware scoring; theme remap preserves *-NN suffix.
 * Ties broken by stableHash(section:businessName:category) so businesses diverge.
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

  const scored = variants.map((id) => ({
    id,
    score: scoreVariant(id, sectionType, options?.brief, options?.chatText),
  }));

  const bestScore = Math.max(...scored.map((item) => item.score));
  const top = scored.filter((item) => item.score === bestScore);
  if (top.length === 1) return top[0]!.id;

  const seed = `${sectionType}:${options?.brief?.businessName ?? ""}:${options?.brief?.category ?? ""}`;
  const idx = stableHash(seed) % top.length;
  return top[idx]!.id;
}
