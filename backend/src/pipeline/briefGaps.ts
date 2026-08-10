import type { Brief } from "../schemas/brief.schema.js";

/** Fields that may be missing or unclear in an extracted brief. */
export type BriefGap =
  | "businessName"
  | "category"
  | "menuItems"
  | "phone"
  | "address";

const CRITICAL_GAPS: BriefGap[] = ["businessName", "category"];

const GENERIC_BUSINESS_NAMES = new Set([
  "restaurant",
  "my business",
  "my restaurant",
  "untitled",
  "business",
  "new restaurant",
  "cafe",
  "bar",
]);

const VAGUE_CATEGORIES = new Set([
  "restaurant",
  "food",
  "dining",
  "cafe",
  "bar",
  "eatery",
  "business",
  "website",
]);

/** Cuisine cues used to rescue vague verticals like "cafe" / "restaurant". */
const CUISINE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bsouth\s*indian\b/i, label: "South Indian" },
  { re: /\bnorth\s*indian\b/i, label: "North Indian" },
  { re: /\bmiddle\s*eastern\b/i, label: "Middle Eastern" },
  { re: /\btex[\s-]?mex\b/i, label: "Tex-Mex" },
  { re: /\bitalian\b/i, label: "Italian" },
  { re: /\bchinese\b/i, label: "Chinese" },
  { re: /\bjapanese\b/i, label: "Japanese" },
  { re: /\bkorean\b/i, label: "Korean" },
  { re: /\bthai\b/i, label: "Thai" },
  { re: /\bvietnamese\b/i, label: "Vietnamese" },
  { re: /\bindian\b/i, label: "Indian" },
  { re: /\bmexican\b/i, label: "Mexican" },
  { re: /\bfrench\b/i, label: "French" },
  { re: /\bgreek\b/i, label: "Greek" },
  { re: /\bspanish\b/i, label: "Spanish" },
  { re: /\bmediterranean\b/i, label: "Mediterranean" },
  { re: /\blebanese\b/i, label: "Lebanese" },
  { re: /\bturkish\b/i, label: "Turkish" },
  { re: /\bpersian\b/i, label: "Persian" },
  { re: /\bamerican\b/i, label: "American" },
  { re: /\bseafood\b/i, label: "Seafood" },
  { re: /\bvegan\b/i, label: "Vegan" },
  { re: /\bvegetarian\b/i, label: "Vegetarian" },
  { re: /\bfusion\b/i, label: "Fusion" },
  { re: /\bpizza\b/i, label: "Pizza" },
  { re: /\bsushi\b/i, label: "Sushi" },
  { re: /\bbbq\b|\bbarbecue\b/i, label: "Barbecue" },
  { re: /\bstreet\s*food\b/i, label: "Street food" },
];

/**
 * Returns true when the business name looks like a placeholder.
 */
export function isGenericBusinessName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return normalized.length < 2 || GENERIC_BUSINESS_NAMES.has(normalized);
}

/**
 * Returns true when the category is too vague to plan a page.
 */
export function isVagueCategory(category: string): boolean {
  const normalized = category.toLowerCase().trim();
  return normalized.length < 2 || VAGUE_CATEGORIES.has(normalized);
}

/**
 * Finds a cuisine label mentioned in chat or category text.
 */
export function findCuisineLabel(text: string): string | null {
  for (const { re, label } of CUISINE_PATTERNS) {
    if (re.test(text)) return label;
  }
  return null;
}

/**
 * When category is vague but chat mentions a cuisine, synthesize a usable category.
 */
export function enrichVagueCategory(
  category: string,
  chatText: string,
): string {
  if (!isVagueCategory(category)) return category.trim();
  const cuisine = findCuisineLabel(`${chatText}\n${category}`);
  if (!cuisine) return category.trim();
  const vertical = category.trim().toLowerCase();
  if (!vertical || vertical === "food" || vertical === "dining" || vertical === "website" || vertical === "business") {
    return `${cuisine} restaurant`;
  }
  return `${cuisine} ${vertical}`;
}

/**
 * Detects missing or unclear brief fields after extraction.
 */
export function detectBriefGaps(brief: Brief): BriefGap[] {
  const gaps: BriefGap[] = [];

  if (!brief.businessName?.trim() || isGenericBusinessName(brief.businessName)) {
    gaps.push("businessName");
  }
  if (!brief.category?.trim() || isVagueCategory(brief.category)) {
    gaps.push("category");
  }
  if (brief.menuItems.length === 0) {
    gaps.push("menuItems");
  }
  if (!brief.phone?.trim()) {
    gaps.push("phone");
  }
  if (!brief.address?.trim()) {
    gaps.push("address");
  }

  return gaps;
}

/**
 * Splits gaps into required vs skippable fields.
 */
export function splitGaps(gaps: BriefGap[]): {
  critical: BriefGap[];
  optional: BriefGap[];
} {
  const critical = gaps.filter((gap) => CRITICAL_GAPS.includes(gap));
  const optional = gaps.filter((gap) => !CRITICAL_GAPS.includes(gap));
  return { critical, optional };
}

/**
 * Returns true when the brief still needs user clarification (legacy helper).
 */
export function briefNeedsClarification(gaps: BriefGap[]): boolean {
  const { critical, optional } = splitGaps(gaps);
  if (critical.length > 0) return true;
  return optional.length > 0;
}

export type BriefReadiness =
  | { status: "ready" }
  | {
      status: "needs_clarification";
      gaps: BriefGap[];
      /** When true, user may reply "skip for now" for remaining optional fields. */
      canSkip: boolean;
    };

/**
 * Evaluates whether a brief is ready to build or needs clarification.
 * Keeps asking until gaps are filled, or the user confirms skip for optional fields.
 * Name + cuisine are required and cannot be skipped.
 */
export function evaluateBriefReadiness(
  brief: Brief,
  options: { skipConfirmed?: boolean } = {},
): BriefReadiness {
  const gaps = detectBriefGaps(brief);
  const { critical, optional } = splitGaps(gaps);

  if (critical.length > 0) {
    return {
      status: "needs_clarification",
      gaps: critical,
      canSkip: false,
    };
  }

  if (optional.length > 0 && !options.skipConfirmed) {
    return {
      status: "needs_clarification",
      gaps: optional,
      canSkip: true,
    };
  }

  return { status: "ready" };
}
