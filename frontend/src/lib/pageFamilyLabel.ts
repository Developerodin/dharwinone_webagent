import type { PageFamily } from "./pageFamily";

const LABELS: Record<PageFamily, string> = {
  premium: "Premium",
  elegant: "Elegant",
  minimal: "Minimal",
  rustic: "Rustic",
  vibrant: "Vibrant",
};

const DESCRIPTIONS: Record<PageFamily, string> = {
  premium: "Warm exquisite layout — auto-selected from your brief",
  elegant: "Upscale dark/gold layout — auto-selected from your brief",
  minimal: "Clean sparse modern layout — auto-selected from your brief",
  rustic: "Earthy farmhouse layout — auto-selected from your brief",
  vibrant: "Bold colorful layout — auto-selected from your brief",
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
 * Suggests available vibes/themes the user can switch between while editing.
 */
export function formatThemeSuggestions(current: PageFamily): string {
  const currentLabel = getPageFamilyLabel(current);
  return [
    `**Themes available now** (current: ${currentLabel}):`,
    `• **Premium** — exquisite warm layout — say “use premium theme”`,
    `• **Elegant** — dark/gold upscale — say “use elegant theme”`,
    `• **Minimal** — clean modern — say “use minimal theme”`,
    `• **Rustic** — earthy farmhouse — say “use rustic theme”`,
    `• **Vibrant** — bold colorful — say “use vibrant theme”`,
    `You can move between them anytime.`,
  ].join("\n");
}
