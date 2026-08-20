/**
 * Detects generic AI marketing slop phrases and cadence in generated copy.
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
  /\bfrom farm to table\b/i,
  /\bworld-class\b/i,
  /\bcutting-edge\b/i,
  /\bnext-generation\b/i,
  /\bsupercharge\b/i,
  /\bempower(?:ing|s|ed)?\b/i,
  /\bstreamline[ds]?\b/i,
  /\bpassion for (?:food|cuisine|cooking)\b/i,
  /\bcurated (?:experience|menu|selection)\b/i,
];

/** "Not X. Y." / "X. Just Y." repeated cadence. */
const APHORISTIC_RE =
  /\bnot (?:a |just |merely )?[^.!?]{2,40}[.!?]\s+(?:just|only|a) [^.!?]{2,40}[.!?]/gi;

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
 * Flags em-dash saturation (Impeccable advisory: ~1 per 500 chars, min 8).
 */
function emDashSaturation(text: string): string | null {
  const dashes = text.match(/—|--/g) ?? [];
  if (dashes.length < 8) return null;
  const density = dashes.length / Math.max(text.length, 1);
  if (density >= 1 / 500) return "em-dash overuse";
  return null;
}

/**
 * Flags banned marketing clichés, aphoristic cadence, and em-dash stacks.
 */
export function slopCheck(copy: Record<string, unknown>): SlopCheckResult {
  const text = extractText(copy);
  const matches: string[] = [];
  for (const pattern of BANNED_PHRASES) {
    const hit = text.match(pattern);
    if (hit?.[0]) matches.push(hit[0]);
  }
  const aphorism = text.match(APHORISTIC_RE);
  if (aphorism?.[0]) matches.push(aphorism[0]);
  const dashes = emDashSaturation(text);
  if (dashes) matches.push(dashes);
  if (matches.length > 0) {
    return { ok: false, matches: [...new Set(matches)] };
  }
  return { ok: true };
}
