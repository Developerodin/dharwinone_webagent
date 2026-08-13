import type { PageFamily } from "../config/pageFamily.js";

/** Named theme matchers (typo-tolerant). */
const FAMILY_NAME_MATCHERS: Array<{ family: PageFamily; pattern: RegExp }> = [
  {
    family: "elegant",
    pattern: /\b(elegant|elegent|elegan|elegnt|elagant|elegnat)\b/i,
  },
  {
    family: "premium",
    pattern: /\b(premium|premum|preimum|primium|premiun|exquisite)\b/i,
  },
  {
    family: "minimal",
    pattern: /\b(minimal|minimalist|minmal|minimial)\b/i,
  },
  {
    family: "rustic",
    pattern: /\b(rustic|rustik|farmhouse)\b/i,
  },
  {
    family: "vibrant",
    pattern: /\b(vibrant|vibant|colorful|colourful)\b/i,
  },
  {
    family: "bold",
    pattern: /\b(bold|burger|qsr|fast[\s-]?food)\b/i,
  },
];

/** Synonyms that map to elegant without saying the theme name. */
const ELEGANT_SYNONYM = /\bfine[\s-]?dining\b/i;

/** Verbs / phrases that signal a theme switch request. */
const THEME_SWITCH_VERB =
  /\b(use|switch(?:\s+to)?|change|cahnge|chnage|chang|set|make\s+it|try|want|go\s+with|update)\b/i;

/** Theme noun including common typos (therme/thme). */
const THEME_NOUN = /\b(theme|therme|thme|vibe|look|style)\b/i;

/**
 * Finds the last named family mention in text.
 */
function pickNamedFamily(text: string): PageFamily | null {
  const toClause = text.match(/\bto\s+([a-z][\w\s-]{0,24})/i);
  if (toClause?.[1]) {
    const target = toClause[1];
    if (ELEGANT_SYNONYM.test(target)) return "elegant";
    for (const { family, pattern } of FAMILY_NAME_MATCHERS) {
      if (pattern.test(target)) return family;
    }
  }

  let bestFamily: PageFamily | null = null;
  let bestIndex = -1;

  for (const { family, pattern } of FAMILY_NAME_MATCHERS) {
    const idx = text.search(pattern);
    if (idx > bestIndex) {
      bestIndex = idx;
      bestFamily = family;
    }
  }

  if (ELEGANT_SYNONYM.test(text)) {
    const synonymIdx = text.search(ELEGANT_SYNONYM);
    if (synonymIdx >= bestIndex) return "elegant";
  }

  return bestFamily;
}

/**
 * Resolves a chat edit instruction to a page family when the user is
 * clearly asking to switch themes (typo-tolerant).
 */
export function resolveThemeFamilyIntent(
  instruction: string,
): PageFamily | null {
  const text = instruction.trim();
  if (!text) return null;

  const lower = text.toLowerCase();

  if (
    /\bdark\s+to\s+light\b/.test(lower) ||
    /\bmake\s+it\s+light\b/.test(lower) ||
    /\blighter\b/.test(lower) ||
    /\blight\s+(theme|therme|thme|mode|version)\b/.test(lower)
  ) {
    return "premium";
  }
  if (
    /\blight\s+to\s+dark\b/.test(lower) ||
    /\bmake\s+it\s+dark\b/.test(lower) ||
    /\bdarker\b/.test(lower) ||
    /\bdark\s+(theme|therme|thme|mode|version)\b/.test(lower)
  ) {
    return "elegant";
  }

  const named = pickNamedFamily(lower);
  if (!named) return null;

  const wantsSwitch =
    THEME_SWITCH_VERB.test(lower) ||
    THEME_NOUN.test(lower) ||
    ELEGANT_SYNONYM.test(lower) ||
    text.split(/\s+/).length <= 4;

  return wantsSwitch ? named : null;
}
