import type { PageFamily } from "../config/pageFamily.js";
import type { Brief } from "../schemas/brief.schema.js";

/** Keyword patterns that suggest an upscale elegant visual theme. */
const ELEGANT_PATTERNS: RegExp[] = [
  /\bfine[\s-]?dining\b/,
  /\bupscale\b/,
  /\belegant\b/,
  /\bmichelin\b/,
  /\btasting menu\b/,
  /\bsommelier\b/,
  /\bluxury\b/,
  /\bgourmet\b/,
  /\bhaute cuisine\b/,
  /\bsteakhouse\b/,
  /\bchef'?s table\b/,
  /\bwhite tablecloth\b/,
  /\breservation only\b/,
  /\bprix fixe\b/,
  /\bformal dining\b/,
  /\brefined\b/,
  /\bsophisticated\b/,
  /\bcaverta\b/,
  /\bdark\b/,
  /\bgold\b/,
];

/** Keyword patterns that suggest a casual premium / exquisite visual theme. */
const PREMIUM_PATTERNS: RegExp[] = [
  /\bpremium\b/,
  /\bexquisite\b/,
  /\bcasual\b/,
  /\bcaf[eé]\b/,
  /\bpizza\b/,
  /\bfast[\s-]?food\b/,
  /\bdiner\b/,
  /\bfood truck\b/,
  /\bquick\b/,
  /\bneighborhood\b/,
  /\bcozy\b/,
  /\bfamily[\s-]?friendly\b/,
  /\bbrunch\b/,
  /\bbakery\b/,
  /\bcounter[\s-]?service\b/,
  /\btakeout\b/,
  /\bgrab[\s-]?and[\s-]?go\b/,
  /\bstreet food\b/,
  /\bburger\b/,
  /\btaco\b/,
  /\bsandwich\b/,
  /\bchinese\b/,
  /\bwok\b/,
  /\bindian\b/,
  /\bthai\b/,
  /\bmexican\b/,
  /\bsushi\b/,
  /\btrattoria\b/,
  /\bbistro\b/,
  /\bnoodle\b/,
  /\bdumpling\b/,
  /\bcurry\b/,
];

/** Clean, sparse, modern minimal theme signals. */
const MINIMAL_PATTERNS: RegExp[] = [
  /\bminimal\b/,
  /\bminimalist\b/,
  /\bclean\b/,
  /\bsimple\b/,
  /\bscandinavian\b/,
  /\bnordic\b/,
  /\bmodern\b/,
  /\bwhite space\b/,
  /\bwhitespace\b/,
  /\bzen\b/,
  /\bjapanese\b/,
  /\bomakase\b/,
  /\bairyn?\b/,
  /\bquiet\b/,
];

/** Warm, farmhouse, wood / rustic theme signals. */
const RUSTIC_PATTERNS: RegExp[] = [
  /\brustic\b/,
  /\bfarmhouse\b/,
  /\bfarm[\s-]?to[\s-]?table\b/,
  /\bwood\b/,
  /\bearthy\b/,
  /\bcountry\b/,
  /\bbarn\b/,
  /\bhaven\b/,
  /\bbbq\b/,
  /\bsmokehouse\b/,
  /\bwine country\b/,
  /\bvineyard\b/,
  /\borgamic\b/,
  /\bhomestyle\b/,
  /\bcraft\b/,
];

/** Bold, colorful, energetic vibrant theme signals. */
const VIBRANT_PATTERNS: RegExp[] = [
  /\bvibrant\b/,
  /\bbold\b/,
  /\bcolorful\b/,
  /\bcolourful\b/,
  /\bbright\b/,
  /\benergetic\b/,
  /\bfun\b/,
  /\bplayful\b/,
  /\bstreet food\b/,
  /\bneon\b/,
  /\btropical\b/,
  /\blatin\b/,
  /\bcaribbean\b/,
  /\bpop\b/,
  /\byouthful\b/,
];

const FAMILY_PATTERNS: Record<PageFamily, RegExp[]> = {
  elegant: ELEGANT_PATTERNS,
  premium: PREMIUM_PATTERNS,
  minimal: MINIMAL_PATTERNS,
  rustic: RUSTIC_PATTERNS,
  vibrant: VIBRANT_PATTERNS,
};

/**
 * Scores text against pattern lists and returns the match count.
 */
function scorePatterns(text: string, patterns: RegExp[]): number {
  return patterns.reduce(
    (score, pattern) => (pattern.test(text) ? score + 1 : score),
    0,
  );
}

/**
 * Infers the page family (visual theme) from brief fields and source chat text.
 * Picks the highest-scoring family; defaults to premium on ties / empty signal.
 */
export function inferPageFamily(brief: Brief, chatText = ""): PageFamily {
  const corpus =
    `${brief.category} ${brief.businessName} ${chatText}`.toLowerCase();

  let best: PageFamily = "premium";
  let bestScore = -1;

  for (const family of Object.keys(FAMILY_PATTERNS) as PageFamily[]) {
    const score = scorePatterns(corpus, FAMILY_PATTERNS[family]);
    if (score > bestScore) {
      bestScore = score;
      best = family;
    }
  }

  return bestScore > 0 ? best : "premium";
}
