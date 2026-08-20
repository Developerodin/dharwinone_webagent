/**
 * Detects edit requests we cannot fulfill in the test-phase MVP,
 * and returns a clear "try something else" message.
 */

import { resolveThemeFamilyIntent } from "./resolveThemeIntent.js";

const UNSUPPORTED_PATTERNS: RegExp[] = [
  /\banimation\b/i,
  /\bdrag[\s-]?resize\b/i,
  /\bcustom\s+font\s+upload\b/i,
  /\bmulti[\s-]?page\b/i,
];

/** Light/dark are theme switches we DO support. */
const SUPPORTED_THEME_COLOR =
  /\b(dark\s+to\s+light|light\s+to\s+dark|make\s+it\s+light|make\s+it\s+dark|lighter|darker)\b/i;

const SUPPORTED_LIST = [
  "• Change / rewrite headlines — “change gallery headline to …” or “rewrite moments headline”",
  "• Color a word — “make Bite! red” / “color Italy #c9a962”",
  "• Brand / button / section colors — “use accent green”, “hero background cream”, “CTA blue”",
  "• Fonts — “use serif on headlines” / “body font sans”",
  "• Add / remove sections — “add testimonials” / “remove gallery”",
  "• Spacing — “tighter about section” / “more space on hero”",
  "• Swap section layouts — “change the about section” / “different hero layout”",
  "• Menu prices / rename / remove items",
  "• Swap catalog images — “different about image”",
  "• Gallery count — “show 4 gallery images”",
  "• Themes — Premium, Elegant, Minimal, Rustic, Vibrant",
  "• Upload your own photos — attach Media in chat",
  "• Location — “add location” / “update location” opens the map picker (Ask-classified, not email address)",
  "• Contact email — “update email to you@studio.com” sets Contact / reservation inbox",
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
    "**Not available yet:** multi-page sites, drag-resize spacing, custom font uploads.",
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

  if (UNSUPPORTED_PATTERNS.some((pattern) => pattern.test(text))) {
    return formatUnsupportedEditMessage("advanced media / layout");
  }

  // Keep light/dark language from being misread — still supported via themes
  if (SUPPORTED_THEME_COLOR.test(text)) {
    return null;
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
