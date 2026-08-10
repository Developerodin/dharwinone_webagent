import type { Brief } from "../schemas/brief.schema.js";
import type { SectionType } from "../schemas/page.schema.js";

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
 * Stage 2 — brief-conditioned section list with a stable core spine.
 */
export function planSections(options: PlanSectionsOptions = {}): SectionType[] {
  const corpus = buildPlanCorpus(options.brief, options.chatText);

  const teamCue = /\b(team|chef|staff|founder|culinary\s*team)\b/.test(corpus);
  const socialProofCue =
    /\b(review|testimonial|award|rated|stars?|loved\s*by|guest\s*say)\b/.test(
      corpus,
    );
  const statsCue =
    socialProofCue ||
    /\b(years?|since\s*\d{4}|guests?|milestones?)\b/.test(corpus);
  const servicesCue =
    /\b(catering|private\s*dining|events?|delivery|takeout|lunch|brunch\s*service|wedding)\b/.test(
      corpus,
    );

  const sections: SectionType[] = ["header", "hero", "about"];

  if (servicesCue) sections.push("services");
  sections.push("menu");
  if (statsCue) sections.push("stats");
  sections.push("gallery");
  if (socialProofCue || !teamCue) sections.push("testimonials");
  if (teamCue) sections.push("team");

  sections.push("reservation", "location_map", "contact", "footer");

  for (const required of CORE_SECTIONS) {
    if (!sections.includes(required)) sections.push(required);
  }

  return sections;
}
