/**
 * Returns true when the last non-empty line looks like a bare brand-name reply.
 */
function looksLikeBrandNameReply(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 48) return false;
  if (/[?]/.test(trimmed)) return false;
  if (
    /\b(?:skip|later|dunno|unknown|n\/a|none|no idea)\b/i.test(trimmed)
  ) {
    return false;
  }
  if (
    /\b(?:restaurant|cafe|café|cuisine|italian|chinese|indian|thai|menu|phone|address|website)\b/i.test(
      trimmed,
    ) &&
    trimmed.split(/\s+/).length > 4
  ) {
    return false;
  }
  // 1–4 title-ish words / brand tokens
  return /^[A-Za-z][\w'&.]*(?:\s+[A-Za-z][\w'&.]*){0,3}$/.test(trimmed);
}

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

  // Clarification merge format: "- … business name?: Acme"
  if (
    /\b(?:business\s+)?name\b[^:\n]{0,40}:\s*[A-Za-z]/i.test(text)
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

  // “website for Dragon Wok” / “website for dragon wok” (case-insensitive)
  if (
    /\b(?:for|at)\s+[A-Za-z][\w'&]+(?:\s+[A-Za-z][\w'&]+){0,3}\b/i.test(text) &&
    !/\b(?:for|at)\s+(?:an?|the|my)\b/i.test(text)
  ) {
    return true;
  }

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? "";
  if (looksLikeBrandNameReply(lastLine) && lines.length >= 2) {
    return true;
  }

  return false;
}
