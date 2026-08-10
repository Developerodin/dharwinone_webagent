/**
 * Detects edit requests we cannot fulfill in the test-phase MVP,
 * and returns a clear "try something else" message.
 */

import { resolveThemeFamilyIntent } from "./resolveThemeIntent.js";

const COLOR_PATTERNS: RegExp[] = [
  /\b(green|red|blue|yellow|orange|pink|purple|violet|teal|maroon|brown|grey|gray|white|black|cream|gold|silver)\b/i,
  /\b(background|bg)\s*colou?r\b/i,
  /\bbutton\s*colou?r\b/i,
  /\bcolou?r\s*(scheme|palette|of|to|from)\b/i,
  /\bmake\s+it\s+(green|red|blue|light|dark)\b/i,
  /\bchange\s+the\s+colou?r\b/i,
];

const LAYOUT_PATTERNS: RegExp[] = [
  /\bfont\b/i,
  /\banimation\b/i,
  /\bvideo\b/i,
  /\bmap\s+embed\b/i,
  /\bgoogle\s+maps?\b/i,
  /\badd\s+a\s+(section|page)\b/i,
  /\bremove\s+(the\s+)?(section|hero|about|menu|gallery)\b/i,
  /\breorder\b/i,
  /\b(?:spacing|gap|padding|margin)\b.+\b(?:section|moments|gallery|hero)\b/i,
  /\bmanage\s+the\s+space\b/i,
];

/** Light/dark are theme switches we DO support (premium/elegant). */
const SUPPORTED_THEME_COLOR =
  /\b(dark\s+to\s+light|light\s+to\s+dark|make\s+it\s+light|make\s+it\s+dark|lighter|darker)\b/i;

const SUPPORTED_LIST = [
  "• Change / rewrite headlines — “change gallery headline to …” or “rewrite moments headline”",
  "• Swap section layouts — “change the about section” / “different hero layout”",
  "• Menu prices / rename / remove items",
  "• Swap catalog images — “different about image”",
  "• Gallery count — “show 4 gallery images” / “add two more images”",
  "• Themes — **Premium** (light) or **Elegant** (dark/gold)",
  "• Upload your own photos — attach Image in chat (jpg/png/webp up to 25MB)",
].join("\n");

/**
 * Friendly unsupported-edit copy with what we can do instead.
 */
export function formatUnsupportedEditMessage(kind: string): string {
  return [
    `**We can’t do that type of change yet** (${kind}).`,
    "",
    "For this test phase we support:",
    SUPPORTED_LIST,
    "",
    "**Not available yet:** custom brand colors (green/red/etc.), button/section color picks, fonts, videos, new sections, manual spacing tweaks.",
    "",
    "Try one of the supported edits above — thank you!",
  ].join("\n");
}

/**
 * Returns an unsupported message when the instruction asks for out-of-scope edits.
 * Returns null when the request looks supported (or is a light/dark theme switch).
 */
export function checkUnsupportedEdit(instruction: string): string | null {
  const text = instruction.trim();
  if (!text) return null;

  // Theme switches (incl. typos) are supported — never treat as custom colors
  if (resolveThemeFamilyIntent(text)) {
    return null;
  }

  // Point chat upload asks at the chat Media button (now wired)
  if (
    /\bupload\b/i.test(text) ||
    /\bmy\s+own\s+(image|photo|picture|video|clip)\b/i.test(text) ||
    /\bdrag\s*(and|&)?\s*drop\b/i.test(text)
  ) {
    return [
      "To replace a section image or video from chat:",
      "1. Tap **Media** under the message box (or drop a file onto it)",
      "2. Choose **Hero / About / Gallery media N**",
      "3. Hit **Upload**",
      "",
      "Supports jpg/png/webp and mp4/webm/mov. Live preview updates immediately.",
    ].join("\n");
  }

  if (LAYOUT_PATTERNS.some((pattern) => pattern.test(text))) {
    return formatUnsupportedEditMessage("layout / fonts / spacing / advanced UI");
  }

  if (
    COLOR_PATTERNS.some((pattern) => pattern.test(text)) &&
    !SUPPORTED_THEME_COLOR.test(text) &&
    !/\b(premium|elegant|elegent|elegan|premum)\s+theme\b/i.test(text)
  ) {
    const onlyLightDark =
      /\b(light|dark)\b/i.test(text) &&
      !/\b(green|red|blue|yellow|orange|pink|purple|teal|maroon)\b/i.test(text);
    if (!onlyLightDark) {
      return formatUnsupportedEditMessage("custom colors like green/red");
    }
  }

  return null;
}

/**
 * Maps light/dark color language to a supported theme family when clear.
 */
export function inferThemeFromColorLanguage(
  instruction: string,
): "premium" | "elegant" | null {
  const lower = instruction.toLowerCase();
  if (
    /\bdark\s+to\s+light\b/.test(lower) ||
    /\bmake\s+it\s+light\b/.test(lower) ||
    /\blighter\b/.test(lower) ||
    /\blight\s+(theme|mode|version)\b/.test(lower)
  ) {
    return "premium";
  }
  if (
    /\blight\s+to\s+dark\b/.test(lower) ||
    /\bmake\s+it\s+dark\b/.test(lower) ||
    /\bdarker\b/.test(lower) ||
    /\bdark\s+(theme|mode|version)\b/.test(lower)
  ) {
    return "elegant";
  }
  return null;
}
