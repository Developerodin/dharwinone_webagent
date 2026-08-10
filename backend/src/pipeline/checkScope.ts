/** Business types outside the restaurant/cafe MVP scope. */
import { resolveThemeFamilyIntent } from "./resolveThemeIntent.js";

const UNSUPPORTED_VERTICAL_PATTERNS: RegExp[] = [
  /\bhotels?\b/,
  /\bmotels?\b/,
  /\bresorts?\b/,
  /\bsalons?\b/,
  /\bspa\b/,
  /\bbarber/,
  /\bgyms?\b/,
  /\bfitness\b/,
  /\byoga\b/,
  /\bclinics?\b/,
  /\bdentists?\b/,
  /\bhospitals?\b/,
  /\breal[\s-]?estate\b/,
  /\brealt(y|or)\b/,
  /\be-?commerce\b/,
  /\bonline\s+store\b/,
  /\bshopify\b/,
  /\blaw\s+firm\b/,
  /\battorney\b/,
  /\bschool\b/,
  /\buniversity\b/,
  /\bchurch\b/,
  /\btemple\b/,
  /\bnightclub\b/,
  /\bcasino\b/,
  /\bcar\s+(dealership|wash|rental)\b/,
  /\bauto\s+repair\b/,
  /\bphotography\b/,
  /\bportfolio\b/,
  /\bsaas\b/,
  /\bstartup\b/,
  /\bagency\b/,
];

/** Clear food/restaurant signals that keep a request in scope. */
const SUPPORTED_FOOD_PATTERNS: RegExp[] = [
  /\brestaurants?\b/,
  /\bcaf[eé]s?\b/,
  /\bbistros?\b/,
  /\btrattoria\b/,
  /\bpizzeria\b/,
  /\bpizza\b/,
  /\bdiner\b/,
  /\beatery\b/,
  /\bstakehouse\b/,
  /\bsteakhouse\b/,
  /\bsushi\b/,
  /\bnoodle\b/,
  /\bbarbecue\b/,
  /\bbbq\b/,
  /\bbrunch\b/,
  /\bbakery\b/,
  /\bfood\b/,
  /\bcuisine\b/,
  /\bmenu\b/,
  /\bdining\b/,
  /\bwok\b/,
  /\btaco\b/,
  /\bburger\b/,
  /\bkitchen\b/,
];

/** Theme/vibe words that are not Premium or Elegant. */
const UNSUPPORTED_THEME_PATTERNS: RegExp[] = [
  /\bcyberpunk\b/,
  /\bminimalist\b/,
  /\bindustrial\b/,
  /\bbrutalist\b/,
  /\bneon\b/,
  /\bretro\b/,
  /\bvintage\b/,
  /\bboho\b/,
  /\bbohemian\b/,
  /\bplayful\b/,
  /\bkawaii\b/,
  /\bcomic\b/,
  /\bsketch\b/,
  /\bhand[- ]?drawn\b/,
  /\b3d\b/,
  /\bglassmorphism\b/,
  /\bmemphis\b/,
  /\bscandinavian\b/,
  /\bjapanese\s+zen\b/,
  /\btheme\s+park\b/,
];

/** Explicit ask for a named theme that isn't premium/elegant. */
const THEME_REQUEST_PATTERN =
  /\b(use|switch to|change to|make it|want|need|try)\b.{0,40}\b(theme|vibe|look|style)\b|\b(theme|vibe)\b.{0,20}\b(like|called)\b/i;

export type ScopeCheckResult =
  | { ok: true }
  | { ok: false; reason: "vertical" | "theme"; message: string };

/**
 * Human copy when the business category is outside MVP scope.
 */
export function formatUnsupportedCategoryMessage(detected?: string): string {
  const hint = detected ? ` (“${detected}”)` : "";
  return [
    "Thanks for sharing!",
    "",
    `**That category isn't available yet${hint}.**`,
    "",
    "Right now we only build **restaurant & cafe** discovery pages.",
    "",
    "**What we offer for now:**",
    "• Food businesses — cafes, pizza spots, Chinese/Indian/Thai kitchens, bistros, fine dining, etc.",
    "• Themes / vibes — **Premium** (casual modern) and **Elegant** (dark/gold upscale)",
    "",
    "Try describing a cafe or restaurant (name, cuisine, menu, location) and we’ll build it.",
    "",
    "Hotels, salons, gyms, clinics, shops, and more categories are **coming soon**. Thank you for your patience!",
  ].join("\n");
}

/**
 * Human copy when a requested theme/vibe isn't available.
 */
export function formatUnsupportedThemeMessage(detected?: string): string {
  const hint = detected ? ` (“${detected}”)` : "";
  return [
    `**That theme isn't available yet${hint}.**`,
    "",
    "For now we offer these vibes:",
    "• **Premium** — casual, modern — say “use premium theme”",
    "• **Elegant** — dark/gold upscale — say “use elegant theme”",
    "",
    "You can move between those anytime. More themes are **coming soon**. Thank you!",
  ].join("\n");
}

/**
 * Finds the first regex match label from a pattern list.
 */
function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0];
  }
  return null;
}

/**
 * Returns true when the corpus looks like a food/restaurant brief.
 */
function hasFoodSignal(text: string): boolean {
  return SUPPORTED_FOOD_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Checks chat + optional category against MVP scope (restaurants + 2 themes).
 */
export function checkScope(args: {
  chatText: string;
  category?: string | null;
}): ScopeCheckResult {
  const corpus = `${args.chatText} ${args.category ?? ""}`.toLowerCase();

  const unsupportedVertical = firstMatch(corpus, UNSUPPORTED_VERTICAL_PATTERNS);
  if (unsupportedVertical && !hasFoodSignal(corpus)) {
    return {
      ok: false,
      reason: "vertical",
      message: formatUnsupportedCategoryMessage(unsupportedVertical),
    };
  }

  // Category field alone is clearly non-food (e.g. "hotel")
  if (args.category) {
    const categoryOnly = args.category.toLowerCase();
    const badCategory = firstMatch(categoryOnly, UNSUPPORTED_VERTICAL_PATTERNS);
    if (badCategory && !hasFoodSignal(categoryOnly)) {
      return {
        ok: false,
        reason: "vertical",
        message: formatUnsupportedCategoryMessage(args.category.trim()),
      };
    }
  }

  const wantsTheme = THEME_REQUEST_PATTERN.test(args.chatText);
  const unsupportedTheme = firstMatch(corpus, UNSUPPORTED_THEME_PATTERNS);
  const asksPremiumOrElegant =
    /\bpremium\b/.test(corpus) || /\belegant\b/.test(corpus);

  if (wantsTheme && unsupportedTheme && !asksPremiumOrElegant) {
    return {
      ok: false,
      reason: "theme",
      message: formatUnsupportedThemeMessage(unsupportedTheme),
    };
  }

  return { ok: true };
}

/**
 * Detects an edit instruction asking for a theme outside premium/elegant.
 */
export function checkThemeEditScope(instruction: string): ScopeCheckResult {
  // Typo-tolerant premium/elegant (and "use Elegant" without "theme")
  if (resolveThemeFamilyIntent(instruction)) {
    return { ok: true };
  }

  const lower = instruction.toLowerCase();
  const asksKnown =
    /\b(premium|elegant|elegent|elegan|premum)\b/.test(lower) &&
    /\b(theme|therme|thme|vibe|look|style)\b/.test(lower);
  if (asksKnown) return { ok: true };

  const unsupportedTheme = firstMatch(lower, UNSUPPORTED_THEME_PATTERNS);
  const themeAsk =
    THEME_REQUEST_PATTERN.test(instruction) ||
    /\b(theme|therme|thme|vibe)\b/.test(lower);

  if (themeAsk && unsupportedTheme) {
    return {
      ok: false,
      reason: "theme",
      message: formatUnsupportedThemeMessage(unsupportedTheme),
    };
  }

  // "use X theme" where X is not premium/elegant (after typo resolve above)
  const named = lower.match(
    /\b(?:use|switch to|change to)\s+([a-z][\w\s-]{1,24}?)\s+(?:theme|therme|thme)\b/,
  );
  if (named?.[1]) {
    const name = named[1].trim();
    if (
      !resolveThemeFamilyIntent(`use ${name} theme`) &&
      name !== "premium" &&
      name !== "elegant"
    ) {
      return {
        ok: false,
        reason: "theme",
        message: formatUnsupportedThemeMessage(name),
      };
    }
  }

  return { ok: true };
}
