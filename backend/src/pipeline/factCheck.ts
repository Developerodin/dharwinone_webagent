import type { Brief } from "../schemas/brief.schema.js";

export type FactCheckResult =
  | { ok: true }
  | { ok: false; flaggedSpans: string[] };

const PHONE_PATTERN =
  /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g;
const PRICE_PATTERN = /\$\s?\d+(?:\.\d{2})?|\d+\.\d{2}\s*(?:USD|usd)?/g;
/** Only flag explicit am/pm times — brief schema has no hours field. */
const TIME_PATTERN =
  /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi;

/**
 * Collects allowed numeric/fact spans from the confirmed brief.
 */
function collectAllowedSpans(brief: Brief): Set<string> {
  const allowed = new Set<string>();

  if (brief.phone) {
    allowed.add(normalizeSpan(brief.phone));
    for (const match of brief.phone.match(PHONE_PATTERN) ?? []) {
      allowed.add(normalizeSpan(match));
    }
  }

  if (brief.address) {
    allowed.add(normalizeSpan(brief.address));
  }

  for (const item of brief.menuItems) {
    allowed.add(normalizeSpan(String(item.price)));
    allowed.add(normalizeSpan(item.price.toFixed(2)));
    allowed.add(normalizeSpan(`$${item.price}`));
    allowed.add(normalizeSpan(`$${item.price.toFixed(2)}`));
    if (Number.isInteger(item.price)) {
      allowed.add(normalizeSpan(`${item.price}.00`));
    }
  }

  return allowed;
}

/**
 * Normalizes a span for comparison (lowercase, strip extra whitespace).
 */
function normalizeSpan(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Parses a numeric price from a matched span.
 */
function parsePriceSpan(span: string): number | null {
  const match = span.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Checks whether a flagged span is allowed by brief facts.
 */
function isAllowedSpan(span: string, allowed: Set<string>, brief: Brief): boolean {
  const normalized = normalizeSpan(span);
  if (allowed.has(normalized)) return true;

  const spanDigits = span.replace(/\D/g, "");
  if (spanDigits.length >= 7 && brief.phone) {
    const briefPhoneDigits = brief.phone.replace(/\D/g, "");
    if (spanDigits === briefPhoneDigits) return true;
  }

  const priceValue = parsePriceSpan(span);
  if (priceValue !== null) {
    for (const item of brief.menuItems) {
      if (Math.abs(item.price - priceValue) < 0.001) return true;
    }
  }

  return false;
}

/**
 * Extracts all string values from copy content recursively.
 */
function extractCopyText(copy: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const value of Object.values(copy)) {
    if (typeof value === "string") {
      parts.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") parts.push(item);
        else if (item && typeof item === "object") {
          parts.push(extractCopyText(item as Record<string, unknown>));
        }
      }
    } else if (value && typeof value === "object") {
      parts.push(extractCopyText(value as Record<string, unknown>));
    }
  }

  return parts.join(" ");
}

/**
 * Stage 5 — regex scan: block invented prices/phones/times not in brief.
 */
export function factCheck(args: {
  copy: Record<string, unknown>;
  brief: Brief;
}): FactCheckResult {
  const { copy, brief } = args;
  const text = extractCopyText(copy);
  const allowed = collectAllowedSpans(brief);

  const flagged: string[] = [];

  for (const pattern of [PHONE_PATTERN, PRICE_PATTERN, TIME_PATTERN]) {
    const regex = new RegExp(pattern.source, pattern.flags);
    for (const match of text.matchAll(regex)) {
      const span = match[0];
      if (!isAllowedSpan(span, allowed, brief)) {
        flagged.push(span);
      }
    }
  }

  if (flagged.length > 0) {
    return { ok: false, flaggedSpans: [...new Set(flagged)] };
  }

  return { ok: true };
}
