import type { Brief } from "../schemas/brief.schema.js";
import type { CreativeDirection } from "../schemas/creativeDirection.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import {
  briefTeam,
  briefTestimonials,
  defaultServices,
  realStats,
} from "./sectionDefaults.js";

/** Core sections every restaurant page includes. */
const CORE_SECTIONS: SectionType[] = [
  "header",
  "hero",
  "about",
  "menu",
  "gallery",
  "reservation",
  "location_map",
  "contact",
  "footer",
];

export type PlanSectionsOptions = {
  brief?: Brief;
  chatText?: string;
  /** When present, prefer Creative Director sectionPlan order. */
  direction?: CreativeDirection | null;
};

/**
 * Builds a lowercase corpus for brief-conditioned section planning.
 */
function buildPlanCorpus(brief?: Brief, chatText = ""): string {
  const menuBits =
    brief?.menuItems
      ?.map((item) => `${item.name} ${item.description ?? ""}`)
      .join(" ") ?? "";
  return `${brief?.category ?? ""} ${brief?.businessName ?? ""} ${menuBits} ${chatText}`.toLowerCase();
}

/**
 * Drops optional sections that lack real brief data.
 */
function applyDataGates(
  types: SectionType[],
  brief: Brief | undefined,
  chatText: string,
): SectionType[] {
  if (!brief) return types;
  const serviceCards = defaultServices(brief, chatText);
  const stats = realStats(brief);
  const testimonials = briefTestimonials(brief);
  const team = briefTeam(brief);

  return types.filter((type) => {
    if (type === "services") return serviceCards.length >= 3;
    if (type === "stats") return stats.length >= 3;
    if (type === "testimonials") return testimonials.length >= 2;
    if (type === "team") return team.length >= 2;
    return true;
  });
}

/**
 * Ensures shell sections and contact when phone/address exist.
 */
function ensureShell(
  types: SectionType[],
  brief?: Brief,
): SectionType[] {
  const next = [...types];
  for (const required of ["header", "hero", "footer"] as const) {
    if (!next.includes(required)) {
      if (required === "header") next.unshift("header");
      else if (required === "footer") next.push("footer");
      else next.splice(1, 0, "hero");
    }
  }
  if (
    brief &&
    (brief.phone || brief.address) &&
    !next.includes("contact")
  ) {
    const footerIdx = next.indexOf("footer");
    if (footerIdx >= 0) next.splice(footerIdx, 0, "contact");
    else next.push("contact");
  }
  // header first, footer last
  const withoutShell = next.filter((t) => t !== "header" && t !== "footer");
  return [
    ...(next.includes("header") ? (["header"] as SectionType[]) : []),
    ...withoutShell,
    ...(next.includes("footer") ? (["footer"] as SectionType[]) : []),
  ];
}

/**
 * Stage 2 — brief-conditioned section list gated on real data availability.
 * Prefers Creative Director sectionPlan when provided.
 */
export function planSections(options: PlanSectionsOptions = {}): SectionType[] {
  const brief = options.brief;
  const chatText = options.chatText ?? "";

  if (options.direction?.sectionPlan?.length) {
    const fromPlan = options.direction.sectionPlan.map((item) => item.type);
    const gated = applyDataGates(fromPlan, brief, chatText);
    return ensureShell(gated, brief);
  }

  const corpus = buildPlanCorpus(brief, chatText);
  const servicesCue =
    /\b(catering|private\s*dining|events?|delivery|takeout|lunch|brunch\s*service|wedding)\b/.test(
      corpus,
    );

  const serviceCards = brief ? defaultServices(brief, chatText) : [];
  const stats = brief ? realStats(brief) : [];
  const testimonials = brief ? briefTestimonials(brief) : [];
  const team = brief ? briefTeam(brief) : [];

  const sections: SectionType[] = ["header", "hero", "about"];

  if (servicesCue && serviceCards.length >= 3) sections.push("services");
  sections.push("menu");
  if (stats.length >= 3) sections.push("stats");
  sections.push("gallery");
  if (testimonials.length >= 2) sections.push("testimonials");
  if (team.length >= 2) sections.push("team");

  sections.push("reservation", "location_map", "contact", "footer");

  for (const required of CORE_SECTIONS) {
    if (!sections.includes(required)) sections.push(required);
  }

  return sections;
}
