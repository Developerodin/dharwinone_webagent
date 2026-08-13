import type { Brief } from "../schemas/brief.schema.js";
import type { Page } from "../schemas/page.schema.js";
import { factCheck, type FactCheckResult } from "./factCheck.js";

/**
 * Fact-checks every section's content on an assembled page.
 * Fails if any phone/price/time span is absent from the brief.
 */
export function factCheckPage(args: {
  page: Page;
  brief: Brief;
}): FactCheckResult {
  const flagged: string[] = [];

  for (const section of args.page.sections) {
    const result = factCheck({
      copy: section.content as Record<string, unknown>,
      brief: args.brief,
    });
    if (!result.ok) {
      flagged.push(...result.flaggedSpans.map((s) => `${section.type}:${s}`));
    }
  }

  // Fabrication guard: named people in testimonials/team must be in brief.
  const allowedNames = new Set<string>();
  const testimonials =
    "testimonials" in args.brief && Array.isArray(args.brief.testimonials)
      ? args.brief.testimonials
      : [];
  for (const t of testimonials) {
    if (t && typeof t === "object" && typeof (t as { name?: unknown }).name === "string") {
      allowedNames.add(((t as { name: string }).name).toLowerCase());
    }
  }
  const team =
    "team" in args.brief && Array.isArray(args.brief.team)
      ? args.brief.team
      : [];
  for (const m of team) {
    if (m && typeof m === "object" && typeof (m as { name?: unknown }).name === "string") {
      allowedNames.add(((m as { name: string }).name).toLowerCase());
    }
  }

  for (const section of args.page.sections) {
    if (section.type !== "testimonials" && section.type !== "team") continue;
    const items =
      section.type === "testimonials"
        ? section.content.items
        : section.content.members;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const name = (item as { name?: unknown }).name;
      if (typeof name !== "string" || !name.trim()) continue;
      if (!allowedNames.has(name.toLowerCase())) {
        flagged.push(`${section.type}:invented-name:${name}`);
      }
    }
  }

  if (flagged.length > 0) {
    return { ok: false, flaggedSpans: [...new Set(flagged)] };
  }
  return { ok: true };
}
