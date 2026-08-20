/**
 * Detects “swap the whole section layout / component” intents.
 */
export function isCycleSectionComponentIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const sectionAlt =
    "hero|about|menu|gallery|moments|location|services|stats|testimonials|team|reservation|header|footer|contact|section|story|reviews?";

  const wantsPlaceNotLayout =
    /\b(location|address|map|google\s*maps?|pin)\b/.test(lower) &&
    !/\b(layout|design|variant|component|style|template|ui)\b/.test(lower);
  if (wantsPlaceNotLayout) {
    return false;
  }

  if (
    /\b(layout|design|variant|component|style|template|ui)\b/.test(lower) &&
    /\b(change|switch|swap|different|another|next|use|try)\b/.test(lower) &&
    new RegExp(`\\b(${sectionAlt})\\b`).test(lower)
  ) {
    return true;
  }
  if (
    new RegExp(
      `\\b(?:change|switch|swap|update)\\b(?:\\s+the)?(?:\\s+entire|\\s+whole)?\\s+(?:${sectionAlt})(?:\\s+section)?\\b`,
    ).test(lower) &&
    !/\b(headline|heading|title|subheading|caption|body|text|copy|image|photo|picture|price|colou?r|background|bg)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    new RegExp(
      `\\b(?:different|another|next)\\b(?:\\s+\\w+){0,2}\\s+(?:${sectionAlt})(?:\\s+section)?\\b`,
    ).test(lower) &&
    !/\b(image|photo|picture|headline|heading)\b/.test(lower)
  ) {
    return true;
  }
  if (
    /\b(header|nav|footer|contact)\b/.test(lower) &&
    /\b(not\s+look|looking\s+good|something\s+else|different|switch|change)\b/.test(
      lower,
    ) &&
    !/\b(colou?r|background|bg|font)\b/.test(lower)
  ) {
    return true;
  }
  return false;
}

/**
 * Detects vague “rewrite this for me” copy intents (no explicit replacement text).
 */
export function isRewriteCopyIntent(text: string): boolean {
  if (isCycleSectionComponentIntent(text)) return false;

  const lower = text.toLowerCase();
  if (
    /\b(to|as)\s+[“"'][^”"']+[”"']/i.test(text) &&
    !/\bsomething else\b|\baccording to you\b|\bbetter\b|\beye[- ]?catching\b/i.test(
      lower,
    )
  ) {
    if (
      /\b(?:change|set|update|rewrite)\b.+\bto\s+[“"']/i.test(text) &&
      !/\bto\s+something\b/i.test(lower)
    ) {
      return false;
    }
  }

  return (
    /\b(according to you|suggest|come up with|make (it |them )?better|eye[- ]?catching|something else|something good|rewrite|rephrase|improve)\b/i.test(
      text,
    ) ||
    /\bchange\b.+\b(heading|headline|title|subheading|caption|line)\b.+\b(else|better|good|fit)\b/i.test(
      text,
    ) ||
    /\b(heading|headline|title|subheading|caption)\b.+\b(something else|according to you|upto|up to)\b/i.test(
      text,
    )
  );
}
