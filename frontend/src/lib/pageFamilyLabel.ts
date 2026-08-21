import type { PageFamily } from "./pageFamily";

const LABELS: Record<PageFamily, string> = {
  premium: "Premium",
  elegant: "Elegant",
  minimal: "Minimal",
  rustic: "Rustic",
  vibrant: "Vibrant",
  bold: "Bold",
};

const DESCRIPTIONS: Record<PageFamily, string> = {
  premium: "Warm exquisite layout — auto-selected from your brief",
  elegant: "Upscale dark/gold layout — auto-selected from your brief",
  minimal: "Black-and-white editorial layout — auto-selected from your brief",
  rustic: "Earthy farmhouse layout — auto-selected from your brief",
  vibrant: "Bold colorful layout — auto-selected from your brief",
  bold: "Casual burger/QSR energy — copper accent, playful script",
};

/**
 * Returns a human-readable label for a page family (visual theme).
 */
export function getPageFamilyLabel(family: PageFamily): string {
  return LABELS[family] ?? "Premium";
}

/**
 * Returns a short description of what the theme suits.
 */
export function getPageFamilyDescription(family: PageFamily): string {
  return DESCRIPTIONS[family] ?? DESCRIPTIONS.premium;
}

/**
 * True when the user is asking which themes exist or to pick one,
 * without naming a specific theme to apply.
 */
export function isThemeInquiryIntent(instruction: string): boolean {
  const text = instruction.trim().toLowerCase();
  if (!text) return false;

  const namedFamily =
    /\b(premium|premum|preimum|elegant|elegent|elegan|minimal|minimalist|minmal|rustic|rustik|farmhouse|vibrant|vibant|colorful|colourful|bold|burger|exquisite|fine[\s-]?dining)\b/.test(
      text,
    );

  const listAsk =
    /\b(what|which|show|list|available|see|tell\s+me)\b.{0,48}\bthemes?\b/.test(
      text,
    ) ||
    /\bthemes?\b.{0,24}\b(available|do you (have|offer)|can i (use|pick|choose))\b/.test(
      text,
    ) ||
    /\b(show|list)\b.{0,24}\b(themes?|vibes?)\b/.test(text);

  if (listAsk) return true;

  const vagueSwitch =
    /\b((change|switch|update|set|pick|choose|select)(\s+(the|a|my))?\s+(theme|vibe|look|style)|different\s+theme|another\s+theme|other\s+themes?)\b/.test(
      text,
    );

  return vagueSwitch && !namedFamily;
}

/**
 * Lists available vibes/themes — only for explicit theme inquiries.
 */
export function formatThemeSuggestions(current: PageFamily): string {
  const currentLabel = getPageFamilyLabel(current);
  return [
    `**Themes available** (current: ${currentLabel}):`,
    `• **Premium** — exquisite warm layout — say “use premium theme”`,
    `• **Elegant** — dark/gold upscale — say “use elegant theme”`,
    `• **Minimal** — black-and-white editorial — say “use minimal theme”`,
    `• **Rustic** — earthy farmhouse — say “use rustic theme”`,
    `• **Vibrant** — bold colorful — say “use vibrant theme”`,
    `• **Bold** — casual burger/QSR energy — say “use bold theme”`,
    `Say which one you want (e.g. “use minimal theme”).`,
  ].join("\n");
}
