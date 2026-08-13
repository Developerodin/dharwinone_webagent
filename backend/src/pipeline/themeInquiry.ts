/**
 * Detects when the user is asking which themes exist (not applying one).
 */
export function isThemeInquiryIntent(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;

  if (
    /\b(what|which|list|show|available)\b.+\bthemes?\b/i.test(lower) ||
    /\bthemes?\b.+\b(available|do you have|can i use|options)\b/i.test(lower) ||
    /^(themes?|show themes?|list themes?)$/i.test(lower)
  ) {
    return true;
  }

  // Bare "change theme" / "use theme" without a family name → inquiry
  if (
    /\b(change|switch|use|set)\s+(the\s+)?theme\b/i.test(lower) &&
    !/\b(premium|elegant|minimal|rustic|vibrant|bold)\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}
