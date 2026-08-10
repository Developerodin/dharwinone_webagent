import type { Page, SectionType } from "../schemas/page.schema.js";

/**
 * Resolves which section an edit instruction most likely targets.
 * Moments / gallery cues beat generic “headline” → hero.
 */
export function inferEditSection(
  text: string,
  fallback: SectionType = "hero",
): SectionType {
  const lower = text.toLowerCase();

  if (/\bmoments\b|\bgallery\b/.test(lower)) return "gallery";
  if (/\babout\b|\bstory\b/.test(lower)) return "about";
  if (/\bmenu\b|\bdish(?:es)?\b|\bpizza\b|\bpasta\b/.test(lower)) {
    return "menu";
  }
  if (/\b(testimonial|review|comment|guests? say)\b/.test(lower)) {
    return "testimonials";
  }
  if (/\b(services?|features?|what we offer)\b/.test(lower)) return "services";
  if (/\b(stats?|counters?|happy guests?)\b/.test(lower)) return "stats";
  if (/\b(team|chefs?|staff)\b/.test(lower)) return "team";
  if (/\b(reservations?|book a table|book your)\b/.test(lower)) {
    return "reservation";
  }
  if (/\blocation\b|\baddress\b|\bvisit\b|\bmap\b/.test(lower)) {
    return "location_map";
  }
  if (/\bhero\b|\bbanner\b|\bslider\b/.test(lower)) return "hero";

  return fallback;
}

/**
 * Finds a section + content field whose string value contains `needle`.
 */
export function findCopyTarget(
  page: Page,
  needle: string,
): { section: SectionType; field: string; value: string } | null {
  const cleaned = needle.trim().toLowerCase();
  if (cleaned.length < 4) return null;

  for (const section of page.sections) {
    for (const [field, raw] of Object.entries(section.content)) {
      if (typeof raw !== "string") continue;
      if (raw.toLowerCase().includes(cleaned)) {
        return { section: section.type, field, value: raw };
      }
    }
  }
  return null;
}

/**
 * Pulls a quoted phrase from an instruction, if present.
 */
export function extractQuotedPhrase(text: string): string | null {
  const match = text.match(/[“"]([^”"]{4,})[”"]/) ?? text.match(/'([^']{4,})'/);
  return match?.[1]?.trim() ?? null;
}

/**
 * Detects “swap the whole section layout / component” intents.
 * e.g. “change the about section”, “different hero layout”, “use another menu”.
 */
export function isCycleSectionComponentIntent(text: string): boolean {
  const lower = text.toLowerCase();
  // Explicit layout / component / design / variant wording
  if (
    /\b(layout|design|variant|component|style|template)\b/.test(lower) &&
    /\b(change|switch|swap|different|another|next|use|try)\b/.test(lower) &&
    /\b(hero|about|menu|gallery|moments|location|services|stats|testimonials|team|reservation|section)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  // “change the about section” / “change entire about section” (not headline/text/image)
  if (
    /\b(?:change|switch|swap|update)\b(?:\s+the)?(?:\s+entire|\s+whole)?\s+(?:hero|about|menu|gallery|moments|location|services|stats|testimonials|team|reservation)(?:\s+section)?\b/.test(
      lower,
    ) &&
    !/\b(headline|heading|title|subheading|caption|body|text|copy|image|photo|picture|price)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    /\b(?:different|another|next)\b(?:\s+\w+){0,2}\s+(?:hero|about|menu|gallery|moments|services|stats|testimonials|team|reservation)(?:\s+section)?\b/.test(
      lower,
    ) &&
    !/\b(image|photo|picture|headline|heading)\b/.test(lower)
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
    // Has an explicit replacement string — not a free rewrite
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

/**
 * Picks the best content field for a rewrite in a section.
 */
export function defaultCopyField(
  section: SectionType,
  instruction: string,
): string {
  const lower = instruction.toLowerCase();
  if (/\bsubheading\b|\bsubtitle\b|\btagline\b/.test(lower)) {
    return section === "hero" ? "subheading" : "caption";
  }
  if (/\bcaption\b|\bline\b/.test(lower)) {
    return section === "gallery" ? "headline" : "caption";
  }
  if (/\bbody\b|\bstory\b/.test(lower)) return "body";
  if (section === "menu") return "sectionTitle";
  if (section === "about" || section === "reservation") return "body";
  if (section === "gallery") return "headline";
  if (section === "location_map") return "directionsNote";
  if (
    section === "services" ||
    section === "testimonials" ||
    section === "team"
  ) {
    return "introText";
  }
  return "headline";
}

/**
 * Extracts an optional max-word constraint from the instruction.
 */
export function extractMaxWords(text: string): number | null {
  const match = text.match(
    /\b(?:up\s*to|upto|max(?:imum)?|only|under)\s+(\d+)\s+words?\b/i,
  );
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.min(30, n) : null;
}
