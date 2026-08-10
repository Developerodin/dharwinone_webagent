/**
 * Returns true when the user confirms they want to continue without missing details.
 */
export function detectSkipIntent(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return (
    /\bskip(\s+for\s+now)?\b/.test(normalized) ||
    /\bcontinue\s+without\b/.test(normalized) ||
    /\bproceed\s+(anyway|without)\b/.test(normalized) ||
    /\bbuild\s+(anyway|without)\b/.test(normalized) ||
    /\bi\s+don'?t\s+have\b/.test(normalized) ||
    /\bleave\s+(it\s+)?blank\b/.test(normalized) ||
    /\bnot\s+now\b/.test(normalized) ||
    /\bno\s+(phone|address|menu)\b/.test(normalized)
  );
}
