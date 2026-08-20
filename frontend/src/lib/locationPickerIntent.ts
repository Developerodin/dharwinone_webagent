export type LocationPickerIntent = {
  prefill: string;
};

const MAX_PICKER_CHARS = 220;

const TYPO_RE =
  /\b(udpate|upadte|upate|adress|locaton|loction|loaction)\b/gi;

const TYPO_MAP: Record<string, string> = {
  udpate: "update",
  upadte: "update",
  upate: "update",
  adress: "address",
  locaton: "location",
  loction: "location",
  loaction: "location",
};

const PLACE_NOUN_RE =
  /\b(location|address|map|google\s*maps?|pin)\b/i;

const ACTION_RE =
  /\b(add|update|change|set|edit|pick|choose|select|put|move)\b/i;

const LAYOUT_RE = /\b(layout|design|variant|component|style|template|ui)\b/i;

/**
 * Normalizes common typos so picker matching stays robust.
 */
function normalizePickerText(text: string): string {
  return text
    .replace(TYPO_RE, (word) => TYPO_MAP[word.toLowerCase()] ?? word)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pulls a street/place string after location/address + "to"/"at"/":".
 */
function extractPrefill(normalized: string): string {
  const match = normalized.match(
    /\b(?:location|address|map|pin)\b(?:\s+(?:on\s+the\s+map|section|pin|embed))?(?:\s+(?:to|at|:)\s+)(.+)$/i,
  );
  if (!match?.[1]) return "";
  return match[1].replace(/[.!?]+$/, "").trim();
}

/**
 * Detects chat asks that should open the location picker instead of a text edit.
 */
export function parseLocationPickerIntent(
  text: string,
): LocationPickerIntent | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_PICKER_CHARS) return null;

  const normalized = normalizePickerText(trimmed);
  if (LAYOUT_RE.test(normalized) && PLACE_NOUN_RE.test(normalized)) {
    return null;
  }

  const lower = normalized.toLowerCase();
  // "email address" is an inbox, not a map pin.
  if (/\bemail\b/.test(lower) || /@[^\s@]+/.test(normalized)) {
    return null;
  }
  const hasPlaceNoun = PLACE_NOUN_RE.test(normalized);
  const hasAction = ACTION_RE.test(normalized);
  const explicitMap =
    /\b(google\s*maps?|map\s+embed|drop\s+a\s+pin)\b/.test(lower) ||
    /\bpick\s+(?:a\s+|the\s+|our\s+)?(?:location|address|pin)\b/.test(lower);

  const wantChangePlace =
    hasPlaceNoun &&
    (hasAction ||
      /\b(need|want|wanna|please)\b/.test(lower) ||
      /^(location|address|map|google\s*maps?)\b/.test(lower));

  if (!explicitMap && !wantChangePlace) return null;

  return { prefill: extractPrefill(normalized) };
}

/**
 * Formats a confirmed pin for intake dumps so extract/verify can keep the facts.
 */
export function formatLocationDumpLine(location: {
  address: string;
  lat: number;
  lng: number;
}): string {
  return `Address: ${location.address}\nCoordinates: ${location.lat}, ${location.lng}`;
}
