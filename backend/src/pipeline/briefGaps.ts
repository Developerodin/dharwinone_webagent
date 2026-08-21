import type { Brief } from "../schemas/brief.schema.js";
import { isPlaceholderRestaurantEmail } from "../lib/leadValidation.js";

/** Fields that may be missing or unclear in an extracted brief. */
export type BriefGap =
  | "businessName"
  | "category"
  | "email"
  | "usp"
  | "signatureDishes"
  | "audience"
  | "story"
  | "hours"
  | "neighbourhood"
  | "menuItems"
  | "phone"
  | "address"
  | "brandColors";

/** Required — cannot skip (Build blocked). */
const CRITICAL_GAPS: BriefGap[] = ["businessName", "category", "email"];

/** Visit facts we actually render — ask before USP. */
const P1_GAPS: BriefGap[] = ["address", "hours", "menuItems"];

/** Copy uniqueness — skippable. */
const P2_GAPS: BriefGap[] = ["usp", "signatureDishes", "audience"];

/** Lowest impact. */
const P3_GAPS: BriefGap[] = [
  "story",
  "neighbourhood",
  "phone",
  "brandColors",
];

/** Max questions per non-location clarification turn. */
export const MAX_CLARIFICATION_QUESTIONS = 3;

/** After this many rounds, drop skippable optionals — never the map pin. */
export const MAX_CLARIFICATION_ROUNDS = 3;

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
  if (
    !vertical ||
    vertical === "food" ||
    vertical === "dining" ||
    vertical === "website" ||
    vertical === "business"
  ) {
    return `${cuisine} restaurant`;
  }
  return `${cuisine} ${vertical}`;
}

/**
 * Gap sort order: P0 critical → P1 copy → P2 story → P3 contact.
 */
function gapRank(gap: BriefGap): number {
  if (CRITICAL_GAPS.includes(gap)) return 0;
  if (P1_GAPS.includes(gap)) return 1;
  if (P2_GAPS.includes(gap)) return 2;
  if (P3_GAPS.includes(gap)) return 3;
  return 9;
}

/**
 * True when this gap is the map-pin / street-address ask.
 */
export function isLocationGap(gap: BriefGap): boolean {
  return gap === "address";
}

/**
 * Picks gaps for one clarification turn.
 * Order: remaining P0 including email → dedicated map pin → everything else.
 * Location never waits on name/cuisine, and never batches with other questions.
 */
export function selectGapsForRound(
  gaps: BriefGap[],
  maxQuestions = MAX_CLARIFICATION_QUESTIONS,
): BriefGap[] {
  if (gaps.length === 0) return [];

  if (gaps.includes("email")) {
    const p0 = gaps.filter((gap) => CRITICAL_GAPS.includes(gap));
    return p0.slice(0, maxQuestions);
  }

  if (gaps.some(isLocationGap)) {
    return ["address"];
  }

  return gaps.slice(0, maxQuestions);
}

/**
 * Detects missing or unclear brief fields after extraction (value-ranked).
 */
export function detectBriefGaps(brief: Brief): BriefGap[] {
  const gaps: BriefGap[] = [];

  if (!brief.businessName?.trim() || isGenericBusinessName(brief.businessName)) {
    gaps.push("businessName");
  }
  if (!brief.category?.trim() || isVagueCategory(brief.category)) {
    gaps.push("category");
  }
  if (isPlaceholderRestaurantEmail(brief.email ?? "")) {
    gaps.push("email");
  }
  if (!brief.address?.trim() && brief.lat == null && brief.lng == null) {
    gaps.push("address");
  }
  if (!brief.hours?.length) gaps.push("hours");
  if (!brief.usp?.trim()) gaps.push("usp");
  if (!brief.signatureDishes?.length) gaps.push("signatureDishes");
  if (!brief.audience?.trim()) gaps.push("audience");
  if (!brief.story?.trim() && brief.foundedYear == null) gaps.push("story");
  if (!brief.neighbourhood?.trim()) gaps.push("neighbourhood");
  if (brief.menuItems.length === 0) gaps.push("menuItems");
  if (!brief.phone?.trim()) gaps.push("phone");
  if (!brief.brandColors?.length) gaps.push("brandColors");

  return gaps.sort((a, b) => gapRank(a) - gapRank(b));
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
 * True when this gap must be asked at least once (user may still skip it).
 */
export function isMustAskBeforeBuild(gap: BriefGap): boolean {
  return gap === "address" || gap === "menuItems";
}

/**
 * Round-cap policy: auto-skip USP/hours/etc, but keep asking for the map pin.
 */
export function applyIntakeRoundCap(
  readiness: BriefReadiness,
  clarificationRound: number,
  options: {
    nameOk: boolean;
    categoryOk: boolean;
    emailOk: boolean;
    addressMissing: boolean;
    maxRounds?: number;
  },
): BriefReadiness {
  if (readiness.status !== "needs_clarification") return readiness;
  const maxRounds = options.maxRounds ?? MAX_CLARIFICATION_ROUNDS;
  if (clarificationRound < maxRounds) return readiness;

  const { critical, optional } = splitGaps(readiness.gaps);
  const mustAsk = optional.filter(isMustAskBeforeBuild);

  if (critical.length === 0) {
    if (mustAsk.length > 0) {
      return { status: "needs_clarification", gaps: mustAsk, canSkip: true };
    }
    if (optional.length > 0) return { status: "ready" };
    return readiness;
  }

  if (clarificationRound < maxRounds + 1) return readiness;

  if (options.nameOk && options.categoryOk && options.emailOk) {
    if (options.addressMissing) {
      return { status: "needs_clarification", gaps: ["address"], canSkip: true };
    }
    return { status: "ready" };
  }

  return { status: "needs_clarification", gaps: critical, canSkip: false };
}

/**
 * Evaluates whether a brief is ready to build.
 * Ready when P0 (name, cuisine, email) is filled AND (no optional gaps or skip).
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
      gaps,
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
