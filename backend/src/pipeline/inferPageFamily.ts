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

/** Casual premium theme — vibe/service words only (not cuisine nouns). */
const PREMIUM_PATTERNS: RegExp[] = [
  /\bpremium\b/,
  /\bexquisite\b/,
  /\bcasual\b/,
  /\bcaf[eé]\b/,
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
  /\bbistro\b/,
  /\btrattoria\b/,
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
  /\bsushi\b/,
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
  /\bbarbecue\b/,
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
  /\bmexican\b/,
  /\btaco\b/,
  /\bpop\b/,
  /\byouthful\b/,
];

/**
 * Soft cuisine → family affinity (cuisine ≠ theme, but nudges diversity).
 * Weight is added once per matching pattern.
 * Tea affinity is handled separately (see applyTeaAffinity) so tea-house can
 * outrank cafe/Indian without hard-mapping all Indian → elegant.
 */
const CUISINE_AFFINITY: Array<{ re: RegExp; family: PageFamily; weight: number }> =
  [
    { re: /\bsteakhouse\b/, family: "elegant", weight: 2 },
    { re: /\bfine[\s-]?dining\b/, family: "elegant", weight: 3 },
    { re: /\bjapanese\b|\bomakase\b|\bsushi\b/, family: "minimal", weight: 2 },
    { re: /\bscandinavian\b|\bnordic\b/, family: "minimal", weight: 2 },
    { re: /\bbbq\b|\bbarbecue\b|\bsmokehouse\b/, family: "rustic", weight: 2 },
    { re: /\bfarm[\s-]?to[\s-]?table\b/, family: "rustic", weight: 2 },
    { re: /\bstreet food\b|\blatin\b|\bcaribbean\b/, family: "vibrant", weight: 2 },
    { re: /\bmexican\b|\btaco\b/, family: "vibrant", weight: 1 },
    { re: /\bcaf[eé]\b|\bbrunch\b|\bbakery\b|\bpizza\b/, family: "premium", weight: 2 },
    { re: /\bchinese\b|\bindian\b|\bthai\b|\bwok\b/, family: "premium", weight: 1 },
  ];

/** Strong “tea house” phrase → elegant +3. */
const TEA_HOUSE_RE = /\btea[\s-]?house\b/;

/**
 * Other tea cues (room / lounge / chai / afternoon tea / bare tea) → elegant +2.
 * Applied only when TEA_HOUSE_RE did not already fire (avoids double-count).
 */
const TEA_CUE_RE =
  /\btea[\s-]?(?:room|lounge)\b|\bafternoon[\s-]?tea\b|\bchai\b|\btea\b/;

/** Casual cafe/service words that should keep tea from auto-winning elegant. */
const STRONG_CASUAL_CAFE_RE =
  /\bcaf[eé]\b|\bbrunch\b|\bbakery\b|\bcasual\b|\bdiner\b|\bfood[\s-]?truck\b|\bcounter[\s-]?service\b/;

/**
 * Applies tea → elegant affinity on the menu-free corpus.
 * Bumps elegant further when tea matched and no strong casual cafe words.
 */
function applyTeaAffinity(
  affinityCorpus: string,
  scores: Record<PageFamily, number>,
): void {
  let teaMatched = false;
  if (TEA_HOUSE_RE.test(affinityCorpus)) {
    scores.elegant += 3;
    teaMatched = true;
  } else if (TEA_CUE_RE.test(affinityCorpus)) {
    scores.elegant += 2;
    teaMatched = true;
  }

  // Tea without casual cafe cues should win elegant without relying on hash.
  if (teaMatched && !STRONG_CASUAL_CAFE_RE.test(affinityCorpus)) {
    scores.elegant += 2;
  }
}

const FAMILY_PATTERNS: Record<PageFamily, RegExp[]> = {
  elegant: ELEGANT_PATTERNS,
  premium: PREMIUM_PATTERNS,
  minimal: MINIMAL_PATTERNS,
  rustic: RUSTIC_PATTERNS,
  vibrant: VIBRANT_PATTERNS,
};

const FAMILY_ORDER: PageFamily[] = [
  "elegant",
  "minimal",
  "rustic",
  "vibrant",
  "premium",
];

/**
 * Stable hash for deterministic tie-breaks across rebuilds.
 */
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

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
 * Builds a scoring corpus from brief + chat (includes menu names).
 */
function buildCorpus(brief: Brief, chatText: string): string {
  const menuBits = brief.menuItems
    .map((item) => `${item.name} ${item.description ?? ""}`)
    .join(" ");
  return `${brief.category} ${brief.businessName} ${brief.address ?? ""} ${menuBits} ${chatText}`.toLowerCase();
}

/**
 * Corpus for cuisine→family affinity (excludes menu names so dishes don't flip theme).
 */
function buildAffinityCorpus(brief: Brief, chatText: string): string {
  return `${brief.category} ${brief.businessName} ${chatText}`.toLowerCase();
}

/**
 * Infers the page family (visual theme) from brief fields and source chat text.
 * Cuisine nouns are soft affinity only — not hard-mapped to premium.
 */
export function inferPageFamily(brief: Brief, chatText = ""): PageFamily {
  const corpus = buildCorpus(brief, chatText);
  const affinityCorpus = buildAffinityCorpus(brief, chatText);
  const scores: Record<PageFamily, number> = {
    elegant: 0,
    premium: 0,
    minimal: 0,
    rustic: 0,
    vibrant: 0,
  };

  for (const family of FAMILY_ORDER) {
    scores[family] = scorePatterns(corpus, FAMILY_PATTERNS[family]);
  }

  for (const { re, family, weight } of CUISINE_AFFINITY) {
    if (re.test(affinityCorpus)) scores[family] += weight;
  }

  applyTeaAffinity(affinityCorpus, scores);

  // Casual cuisine should not lose to a lone weak elegant word like "gourmet".
  if (scores.elegant === 1 && scores.premium >= 1) {
    scores.elegant = 0;
  }

  let bestScore = Math.max(...Object.values(scores));
  if (bestScore <= 0) return "premium";

  const leaders = FAMILY_ORDER.filter((family) => scores[family] === bestScore);
  if (leaders.length === 1) return leaders[0]!;

  // Near-ties: diversify by business identity among top scorers within 1 point.
  const near = FAMILY_ORDER.filter((family) => scores[family] >= bestScore - 1 && scores[family] > 0);
  const pool = near.length > 0 ? near : leaders;
  const idx = stableHash(brief.businessName || corpus) % pool.length;
  return pool[idx]!;
}
