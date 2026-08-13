import type { Page, SectionType } from "../schemas/page.schema.js";
import {
  normalizeSearchText,
  similarity,
  tokenOverlapScore,
} from "./fuzzyMatch.js";
import { textFieldToPlain } from "./textRuns.js";

/** Alias phrases → section type for typo-tolerant NL matching. */
const SECTION_ALIASES: Array<{ alias: string; section: SectionType }> = [
  { alias: "about", section: "about" },
  { alias: "about us", section: "about" },
  { alias: "story", section: "about" },
  { alias: "our story", section: "about" },
  { alias: "story section", section: "about" },
  { alias: "storysection", section: "about" },
  { alias: "hero", section: "hero" },
  { alias: "banner", section: "hero" },
  { alias: "slider", section: "hero" },
  { alias: "menu", section: "menu" },
  { alias: "dishes", section: "menu" },
  { alias: "gallery", section: "gallery" },
  { alias: "moments", section: "gallery" },
  { alias: "photos", section: "gallery" },
  { alias: "testimonials", section: "testimonials" },
  { alias: "testimonial", section: "testimonials" },
  { alias: "reviews", section: "testimonials" },
  { alias: "review", section: "testimonials" },
  { alias: "guest comments", section: "testimonials" },
  { alias: "guests say", section: "testimonials" },
  { alias: "services", section: "services" },
  { alias: "service", section: "services" },
  { alias: "features", section: "services" },
  { alias: "what we offer", section: "services" },
  { alias: "stats", section: "stats" },
  { alias: "stat", section: "stats" },
  { alias: "counters", section: "stats" },
  { alias: "happy guests", section: "stats" },
  { alias: "team", section: "team" },
  { alias: "chefs", section: "team" },
  { alias: "staff", section: "team" },
  { alias: "reservation", section: "reservation" },
  { alias: "reservations", section: "reservation" },
  { alias: "booking", section: "reservation" },
  { alias: "book a table", section: "reservation" },
  { alias: "location", section: "location_map" },
  { alias: "location map", section: "location_map" },
  { alias: "address", section: "location_map" },
  { alias: "visit", section: "location_map" },
  { alias: "map", section: "location_map" },
  { alias: "header", section: "header" },
  { alias: "nav", section: "header" },
  { alias: "navigation", section: "header" },
  { alias: "footer", section: "footer" },
  { alias: "contact", section: "contact" },
  { alias: "contact us", section: "contact" },
];

/**
 * Fuzzy-resolves a section type from instruction text (aliases + optional page copy).
 */
export function resolveSectionFromText(
  text: string,
  page?: Page,
): { section: SectionType; score: number } | null {
  const normalized = normalizeSearchText(text);
  if (!normalized) return null;

  const candidates = SECTION_ALIASES.map((entry) => ({
    key: entry.alias,
    value: entry.section,
  }));

  let best: { section: SectionType; score: number; aliasLen: number } | null =
    null;
  const tokens = normalized.split(" ").filter(Boolean);
  const aliasTokenCount = (alias: string) => alias.split(" ").length;

  for (const { key, value } of candidates) {
    const alias = normalizeSearchText(key);
    if (!alias) continue;

    let score = 0;
    const aliasTokens = alias.split(" ");
    for (let i = 0; i + aliasTokens.length <= tokens.length; i++) {
      const window = tokens.slice(i, i + aliasTokens.length).join(" ");
      if (window === alias) {
        score = Math.max(score, 0.96 + Math.min(0.03, alias.length / 80));
      } else {
        score = Math.max(score, similarity(window, alias));
      }
    }
    if (aliasTokens.length === 1) {
      for (const token of tokens) {
        score = Math.max(score, similarity(token, alias));
      }
    } else {
      const n = aliasTokenCount(alias);
      for (let i = 0; i + n <= tokens.length; i++) {
        const window = tokens.slice(i, i + n).join(" ");
        score = Math.max(score, similarity(window, alias));
      }
    }

    const minScore = alias.length <= 3 ? 0.9 : 0.72;
    if (score < minScore) continue;

    const aliasLen = alias.length;
    if (
      !best ||
      score > best.score + 0.02 ||
      (Math.abs(score - best.score) <= 0.02 && aliasLen > best.aliasLen) ||
      (score === best.score && aliasLen > best.aliasLen)
    ) {
      best = { section: value, score, aliasLen };
    }
  }

  if (best && best.score >= 0.72) {
    return { section: best.section, score: best.score };
  }

  if (page) {
    let copyBest: { section: SectionType; score: number } | null = null;
    for (const section of page.sections) {
      for (const raw of Object.values(section.content)) {
        const plain = textFieldToPlain(raw);
        if (plain.length < 4) continue;
        const score = Math.max(
          tokenOverlapScore(text, plain),
          similarity(text, plain),
        );
        if (score < 0.78) continue;
        if (!copyBest || score > copyBest.score) {
          copyBest = { section: section.type, score };
        }
      }
    }
    if (copyBest) return copyBest;
  }

  return null;
}

/**
 * Resolves which section an edit instruction most likely targets.
 */
export function inferEditSection(
  text: string,
  fallback: SectionType = "hero",
): SectionType {
  const resolved = resolveSectionFromText(text);
  if (resolved && resolved.score >= 0.72) return resolved.section;

  const lower = text.toLowerCase();
  if (/\bmoments\b|\bgallery\b/.test(lower)) return "gallery";
  if (/\babout\b|\bstory\b/.test(lower)) return "about";
  if (/\bmenu\b|\bdish(?:es)?\b|\bpizza\b|\bpasta\b/.test(lower)) {
    return "menu";
  }
  if (/\b(testimonial|review|comment|guests? say)\b/.test(lower)) {
    return "testimonials";
  }
  if (/\b(services?|features?|what we offer)\b/.test(lower)) return "services";
  if (/\b(stats?|counters?|happy guests?)\b/.test(lower)) return "stats";
  if (/\b(team|chefs?|staff)\b/.test(lower)) return "team";
  if (/\b(reservations?|book a table|book your)\b/.test(lower)) {
    return "reservation";
  }
  if (/\blocation\b|\baddress\b|\bvisit\b|\bmap\b/.test(lower)) {
    return "location_map";
  }
  if (/\bheader\b|\bnav\b|\bnavigation\b/.test(lower)) return "header";
  if (/\bfooter\b/.test(lower)) return "footer";
  if (/\bcontact\b|\bcontact\s+us\b/.test(lower)) return "contact";
  if (/\bhero\b|\bbanner\b|\bslider\b/.test(lower)) return "hero";

  return fallback;
}
