import type { Page, SectionType } from "../schemas/page.schema.js";
import {
  bestFuzzyMatch,
  normalizeSearchText,
  similarity,
  tokenOverlapScore,
} from "./fuzzyMatch.js";
import {
  inferEditSection,
  resolveSectionFromText,
} from "./sectionResolve.js";
import { textFieldToPlain } from "./textRuns.js";

export {
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
} from "./editIntents.js";
export {
  inferEditSection,
  resolveSectionFromText,
} from "./sectionResolve.js";

/** Field alias phrases → logical field keys (section-aware remap later). */
const FIELD_ALIASES: Array<{ alias: string; field: string }> = [
  { alias: "headline", field: "headline" },
  { alias: "heading", field: "headline" },
  { alias: "title", field: "headline" },
  { alias: "subheading", field: "subheading" },
  { alias: "subtitle", field: "subheading" },
  { alias: "tagline", field: "subheading" },
  { alias: "suhadeing", field: "subheading" },
  { alias: "subheadingg", field: "subheading" },
  { alias: "subheding", field: "subheading" },
  { alias: "headlne", field: "headline" },
  { alias: "hedline", field: "headline" },
  { alias: "body", field: "body" },
  { alias: "caption", field: "caption" },
  { alias: "intro", field: "introText" },
  { alias: "intro text", field: "introText" },
  { alias: "section title", field: "sectionTitle" },
  { alias: "cta", field: "ctaLabel" },
  { alias: "button", field: "ctaLabel" },
  { alias: "directions", field: "directionsNote" },
];

export type ResolvedEditTarget = {
  section: SectionType;
  field?: string;
  copyMatch?: string;
  confidence: number;
};

/**
 * Finds a section + content field whose value matches `needle` (exact then fuzzy).
 */
export function findCopyTarget(
  page: Page,
  needle: string,
): { section: SectionType; field: string; value: string } | null {
  const cleaned = needle.trim();
  if (cleaned.length < 3) return null;
  const needleLower = cleaned.toLowerCase();

  for (const section of page.sections) {
    for (const [field, raw] of Object.entries(section.content)) {
      const plain = textFieldToPlain(raw);
      if (!plain) continue;
      if (plain.toLowerCase().includes(needleLower)) {
        return { section: section.type, field, value: plain };
      }
    }
  }

  let best: {
    section: SectionType;
    field: string;
    value: string;
    score: number;
  } | null = null;

  for (const section of page.sections) {
    for (const [field, raw] of Object.entries(section.content)) {
      const plain = textFieldToPlain(raw);
      if (plain.length < 3) continue;
      const score = Math.max(
        similarity(cleaned, plain),
        tokenOverlapScore(cleaned, plain),
      );
      if (score < 0.78) continue;
      if (!best || score > best.score) {
        best = { section: section.type, field, value: plain, score };
      }
    }
  }

  return best
    ? { section: best.section, field: best.field, value: best.value }
    : null;
}

/**
 * Pulls a quoted phrase from an instruction, if present.
 */
export function extractQuotedPhrase(text: string): string | null {
  const match = text.match(/[“"]([^”"]{4,})[”"]/) ?? text.match(/'([^']{4,})'/);
  return match?.[1]?.trim() ?? null;
}

/**
 * Fuzzy-maps field words (incl. typos like suhadeing) to a content field key.
 */
export function resolveCopyField(
  section: SectionType,
  instruction: string,
): string {
  const candidates = FIELD_ALIASES.map((entry) => ({
    key: entry.alias,
    value: entry.field,
  }));

  const tokens = normalizeSearchText(instruction).split(" ").filter(Boolean);
  let bestField: string | null = null;
  let bestScore = 0;

  for (const token of tokens) {
    const hit = bestFuzzyMatch(token, candidates, 0.74);
    if (hit && hit.score > bestScore) {
      bestScore = hit.score;
      bestField = hit.value;
    }
  }

  for (const { key, value } of candidates) {
    if (!key.includes(" ")) continue;
    if (normalizeSearchText(instruction).includes(normalizeSearchText(key))) {
      bestField = value;
      bestScore = 1;
    }
  }

  if (bestField) {
    return remapFieldForSection(section, bestField, instruction);
  }

  return defaultCopyField(section, instruction);
}

/**
 * Remaps generic field names to section-specific content keys.
 */
function remapFieldForSection(
  section: SectionType,
  field: string,
  instruction: string,
): string {
  if (field === "subheading") {
    if (section === "hero") return "subheading";
    if (section === "gallery") return "caption";
    return section === "menu" ? "sectionTitle" : "caption";
  }
  if (field === "headline") {
    if (section === "menu") return "sectionTitle";
    if (
      section === "services" ||
      section === "testimonials" ||
      section === "team"
    ) {
      if (/\bintro\b/i.test(instruction)) return "introText";
    }
    return "headline";
  }
  if (field === "body" && section === "gallery") return "caption";
  if (field === "introText" && section === "hero") return "subheading";
  return field;
}

/**
 * Picks the best content field for a rewrite in a section.
 */
export function defaultCopyField(
  section: SectionType,
  instruction: string,
): string {
  const lower = instruction.toLowerCase();

  if (/\b(headline|heading|title)\b/.test(lower)) {
    if (section === "menu") return "sectionTitle";
    return "headline";
  }
  if (/\bsubheading\b|\bsubtitle\b|\btagline\b/.test(lower)) {
    return section === "hero" ? "subheading" : "caption";
  }
  if (/\bcaption\b|\bline\b/.test(lower)) {
    return section === "gallery" ? "headline" : "caption";
  }
  if (/\bbody\b/.test(lower)) return "body";
  if (/\bstory\b/.test(lower) && !/\b(headline|heading|title)\b/.test(lower)) {
    return "body";
  }
  if (section === "menu") return "sectionTitle";
  if (section === "about" || section === "reservation") return "body";
  if (section === "gallery") return "headline";
  if (section === "location_map") return "directionsNote";
  if (
    section === "services" ||
    section === "testimonials" ||
    section === "team"
  ) {
    return "introText";
  }
  return "headline";
}

/**
 * Extracts an optional max-word constraint from the instruction.
 */
export function extractMaxWords(text: string): number | null {
  const match = text.match(
    /\b(?:up\s*to|upto|max(?:imum)?|only|under)\s+(\d+)\s+words?\b/i,
  );
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.min(30, n) : null;
}

/**
 * Unified edit-target search: section + field + optional on-page copy match.
 */
export function resolveEditTarget(
  instruction: string,
  page?: Page,
): ResolvedEditTarget {
  const quoted = extractQuotedPhrase(instruction);
  const copyHit =
    quoted && page
      ? findCopyTarget(page, quoted)
      : page
        ? findLeadingCopyTarget(page, instruction)
        : null;

  const sectionResolved = resolveSectionFromText(instruction, page);
  const section: SectionType =
    sectionResolved && sectionResolved.score >= 0.72
      ? sectionResolved.section
      : (copyHit?.section ?? inferEditSection(instruction, "hero"));

  const preferSectionCue =
    sectionResolved != null && sectionResolved.score >= 0.85;

  const finalSection = preferSectionCue
    ? sectionResolved!.section
    : (copyHit?.section ?? section);

  const field =
    copyHit && !preferSectionCue
      ? copyHit.field
      : resolveCopyField(finalSection, instruction);

  const confidence = Math.max(
    sectionResolved?.score ?? 0,
    copyHit ? 0.9 : 0,
  );

  return {
    section: finalSection,
    field,
    copyMatch: copyHit?.value,
    confidence,
  };
}

/**
 * Tries to match a leading unquoted phrase to on-page copy.
 */
function findLeadingCopyTarget(
  page: Page,
  instruction: string,
): { section: SectionType; field: string; value: string } | null {
  const leading = instruction.match(
    /^([A-Za-z][^.]{6,80}?)\s+(?:change|rewrite|to something|make|color|colour)/i,
  );
  if (leading?.[1]) return findCopyTarget(page, leading[1]);

  const words = instruction.split(/\s+/).filter((w) => w.length > 2);
  if (words.length >= 4) {
    for (let len = Math.min(8, words.length); len >= 4; len--) {
      for (let i = 0; i + len <= words.length; i++) {
        const phrase = words.slice(i, i + len).join(" ");
        if (/^(change|make|set|update|color|colour|background)/i.test(phrase)) {
          continue;
        }
        const hit = findCopyTarget(page, phrase);
        if (hit) return hit;
      }
    }
  }
  return null;
}

/**
 * Fuzzy equality for menu item names (typo-tolerant).
 */
export function namesFuzzyMatch(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (left.toLowerCase() === right.toLowerCase()) return true;
  return (
    similarity(left, right) >= 0.82 || tokenOverlapScore(left, right) >= 0.85
  );
}
