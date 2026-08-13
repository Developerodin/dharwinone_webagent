/**
 * Detects generic AI marketing slop phrases in generated copy.
 */

const BANNED_PHRASES: RegExp[] = [
  /\bauthentic experience\b/i,
  /\bculinary journey\b/i,
  /\ba feast for the senses\b/i,
  /\bwhere tradition meets innovation\b/i,
  /\bnestled in the heart of\b/i,
  /\belevate your dining\b/i,
  /\bgastronomic (?:adventure|delight|experience)\b/i,
  /\bhidden gem\b/i,
];

export type SlopCheckResult =
  | { ok: true }
  | { ok: false; matches: string[] };

/**
 * Extracts string leaves from nested copy JSON.
 */
function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractText).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(extractText)
      .join(" ");
  }
  return "";
}

/**
 * Flags banned marketing clichés in section copy.
 */
export function slopCheck(copy: Record<string, unknown>): SlopCheckResult {
  const text = extractText(copy);
  const matches: string[] = [];
  for (const pattern of BANNED_PHRASES) {
    const hit = text.match(pattern);
    if (hit?.[0]) matches.push(hit[0]);
  }
  if (matches.length > 0) {
    return { ok: false, matches: [...new Set(matches)] };
  }
  return { ok: true };
}
