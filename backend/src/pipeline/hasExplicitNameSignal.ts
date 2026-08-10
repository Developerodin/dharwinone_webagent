/**
 * Returns true when the user clearly stated a restaurant/cafe brand name.
 * Cuisine-only or “X based restaurant” phrasing alone is not enough.
 */
export function hasExplicitNameSignal(chatText: string): boolean {
  const text = chatText.trim();
  if (!text) return false;

  if (
    /\b(?:restaurant|cafe|café|business|brand)\s*name\b/i.test(text) ||
    /\bname\s*(?:is|:)\s*[A-Za-z]/i.test(text) ||
    /\b(?:named|called)\s+[A-Za-z]/i.test(text)
  ) {
    return true;
  }

  // “my Chineeh Cafe” / “for my Nonna Rosa”
  if (
    /\b(?:for\s+)?my\s+[A-Za-z][\w'&]*(?:\s+[A-Za-z][\w'&]*){0,3}\s+(?:cafe|café|restaurant|bistro|trattoria|kitchen|bar)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  // “website for Dragon Wok” (brand before end / cuisine word)
  if (
    /\b(?:for|at)\s+[A-Z][A-Za-z'&]+(?:\s+[A-Z][A-Za-z'&]+){0,3}\b/.test(text) &&
    !/\b(?:for|at)\s+(?:an?|the|my)\b/i.test(text)
  ) {
    return true;
  }

  return false;
}
