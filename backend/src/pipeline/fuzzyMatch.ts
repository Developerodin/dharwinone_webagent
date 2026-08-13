/**
 * Lightweight fuzzy string utilities for edit-target search (no deps).
 */

/** Known glued compounds → spaced form for typo-tolerant section labels. */
const COMPOUND_SPLITS: Array<[RegExp, string]> = [
  [/storysection/g, "story section"],
  [/aboutus/g, "about us"],
  [/ourstory/g, "our story"],
  [/guestbook/g, "guest book"],
  [/guestcomments/g, "guest comments"],
  [/locationmap/g, "location map"],
  [/bookatable/g, "book a table"],
];

/**
 * Lowercases, strips punctuation, collapses spaces, and splits known compounds.
 */
export function normalizeSearchText(s: string): string {
  let out = s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  for (const [re, repl] of COMPOUND_SPLITS) {
    out = out.replace(re, repl);
  }
  out = out
    .replace(/[^a-z0-9\s#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

/**
 * Classic Levenshtein edit distance.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);

  for (let j = 0; j < cols; j++) prev[j] = j;

  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + cost,
      );
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j]!;
  }

  return prev[b.length]!;
}

/**
 * Similarity score in 0..1 from edit distance (1 = identical).
 */
export function similarity(a: string, b: string): number {
  const left = normalizeSearchText(a);
  const right = normalizeSearchText(b);
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length);
    const longer = Math.max(left.length, right.length);
    return Math.max(0.85, shorter / longer);
  }
  const dist = levenshtein(left, right);
  const maxLen = Math.max(left.length, right.length);
  return 1 - dist / maxLen;
}

export type FuzzyMatchResult<T> = {
  value: T;
  score: number;
  candidate: string;
};

/**
 * Returns the best fuzzy match above `minScore`, or null.
 */
export function bestFuzzyMatch<T>(
  query: string,
  candidates: Array<{ key: string; value: T }>,
  minScore = 0.72,
): FuzzyMatchResult<T> | null {
  const q = normalizeSearchText(query);
  if (!q) return null;

  let best: FuzzyMatchResult<T> | null = null;
  for (const { key, value } of candidates) {
    const score = similarity(q, key);
    if (score < minScore) continue;
    if (!best || score > best.score) {
      best = { value, score, candidate: key };
    }
  }
  return best;
}

/**
 * Token-overlap score: shared tokens / max token count, with per-token fuzzy.
 */
export function tokenOverlapScore(query: string, target: string): number {
  const qTokens = normalizeSearchText(query).split(" ").filter(Boolean);
  const tTokens = normalizeSearchText(target).split(" ").filter(Boolean);
  if (!qTokens.length || !tTokens.length) return 0;

  let matched = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const tt of tTokens) {
      best = Math.max(best, similarity(qt, tt));
    }
    if (best >= 0.78) matched += best;
  }
  return matched / Math.max(qTokens.length, tTokens.length);
}

/**
 * Finds the best contiguous window in `haystack` matching `needle` fuzzily.
 */
export function findBestFuzzySubstring(
  haystack: string,
  needle: string,
  minScore = 0.78,
): { index: number; length: number; score: number } | null {
  const plain = haystack;
  const n = normalizeSearchText(needle);
  if (!plain || !n || n.length < 3) return null;

  const plainLower = plain.toLowerCase();
  const exact = plainLower.indexOf(needle.toLowerCase());
  if (exact >= 0) {
    return { index: exact, length: needle.length, score: 1 };
  }

  const normPlain = normalizeSearchText(plain);
  if (normPlain.includes(n)) {
    // Map normalized hit back approximately via original case-insensitive scan of tokens
    const firstToken = n.split(" ")[0] ?? n;
    const idx = plainLower.indexOf(firstToken);
    if (idx >= 0) {
      const endGuess = Math.min(plain.length, idx + needle.length + 4);
      return {
        index: idx,
        length: Math.max(needle.length, endGuess - idx),
        score: 0.9,
      };
    }
  }

  const targetLen = Math.max(3, Math.min(plain.length, needle.length));
  const windowPad = Math.max(2, Math.floor(needle.length * 0.25));
  let best: { index: number; length: number; score: number } | null = null;

  for (
    let len = Math.max(3, targetLen - windowPad);
    len <= Math.min(plain.length, targetLen + windowPad);
    len++
  ) {
    for (let i = 0; i + len <= plain.length; i++) {
      const slice = plain.slice(i, i + len);
      const score = similarity(slice, needle);
      if (score < minScore) continue;
      if (!best || score > best.score) {
        best = { index: i, length: len, score };
      }
    }
  }

  return best;
}
