/**
 * Helpers for plain-string or styled text runs in section content fields.
 */

import { findBestFuzzySubstring } from "./fuzzyMatch.js";

export type TextRun = { text: string; color?: string };

export type StyledTextValue = string | { runs: TextRun[] };

/**
 * Flattens a content field to plain text.
 */
export function textFieldToPlain(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { runs?: unknown }).runs)
  ) {
    return (value as { runs: TextRun[] }).runs
      .map((run) => (typeof run?.text === "string" ? run.text : ""))
      .join("");
  }
  return "";
}

/**
 * Applies a color to the first match of `match` inside a field (exact then fuzzy).
 */
export function applyMatchColor(
  current: unknown,
  match: string,
  colorHex: string,
): StyledTextValue | null {
  const plain = textFieldToPlain(current);
  if (!plain || !match.trim()) return null;

  const exactIdx = plain.toLowerCase().indexOf(match.toLowerCase());
  let index = exactIdx;
  let length = match.length;

  if (exactIdx < 0) {
    const fuzzy = findBestFuzzySubstring(plain, match, 0.78);
    if (!fuzzy) return null;
    index = fuzzy.index;
    length = fuzzy.length;
  }

  const before = plain.slice(0, index);
  const hit = plain.slice(index, index + length);
  const after = plain.slice(index + length);

  const runs: TextRun[] = [];
  if (before) runs.push({ text: before });
  runs.push({ text: hit, color: colorHex });
  if (after) runs.push({ text: after });
  return { runs };
}
