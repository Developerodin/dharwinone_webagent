import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getModelFor, getOpenAIClient } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import {
  archetypeSchema,
  narrativeSchema,
  sectionPlanItemSchema,
  type Archetype,
  type Narrative,
  type SectionPlanItem,
} from "../schemas/creativeDirection.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import { planSections } from "./planSections.js";

const llmDirectionSchema = z.object({
  archetype: archetypeSchema,
  sectionPlan: z.array(sectionPlanItemSchema).min(5).max(16),
  narrative: narrativeSchema,
  rationale: z.string().min(1),
});

/**
 * Infers a deterministic archetype from brief + chat cues (fixture / fallback).
 */
export function inferArchetype(brief: Brief, chatText: string): Archetype {
  const corpus = `${brief.category} ${brief.audience ?? ""} ${brief.usp ?? ""} ${chatText}`.toLowerCase();
  if (/\b(takeaway|takeout|counter|quick|lunch\s*counter|qsr)\b/.test(corpus)) {
    return "quick_service";
  }
  if (/\b(rooftop|cocktail|bar|immersive|gallery|design)\b/.test(corpus)) {
    return "visual_immersive";
  }
  if (/\b(fine\s*dining|tasting|reserve|reservation\s*only)\b/.test(corpus) || brief.priceBand === "fine_dining") {
    return "reservation_first";
  }
  if (/\b(heritage|family|since\s*\d{4}|story|founded)\b/.test(corpus) || brief.story) {
    return "story_led";
  }
  if (/\b(neighbourhood|neighborhood|local|everyday)\b/.test(corpus) || brief.neighbourhood) {
    return "neighbourhood";
  }
  if ((brief.signatureDishes?.length ?? 0) > 0 || brief.menuItems.length >= 3) {
    return "menu_forward";
  }
  return "neighbourhood";
}

/**
 * Builds a default section plan from the data-gated planner + archetype tweaks.
 */
export function buildFixtureSectionPlan(
  brief: Brief,
  chatText: string,
  archetype: Archetype,
): SectionPlanItem[] {
  let types = planSections({ brief, chatText });

  if (archetype === "menu_forward") {
    types = reorderTypes(types, ["header", "hero", "menu", "about"]);
  } else if (archetype === "story_led") {
    types = reorderTypes(types, ["header", "hero", "about", "menu"]);
  } else if (archetype === "reservation_first") {
    types = reorderTypes(types, ["header", "hero", "reservation", "menu"]);
  } else if (archetype === "visual_immersive") {
    types = reorderTypes(types, ["header", "hero", "gallery", "about"]);
  } else if (archetype === "quick_service") {
    types = reorderTypes(types, ["header", "hero", "menu", "location_map"]);
  }

  return types.map((type) => ({
    type,
    emphasis: type === "hero" ? "hero" : type === "about" || type === "menu" ? "major" : "standard",
    layoutIntent:
      type === "hero"
        ? "full_bleed"
        : type === "about"
          ? "split_left"
          : type === "menu" || type === "gallery"
            ? "grid"
            : "centered",
    background: type === "hero" ? "image" : type === "footer" || type === "header" ? "base" : "base",
    spacing: type === "hero" ? "roomy" : type === "stats" ? "tight" : "normal",
  }));
}

/**
 * Reorders section types so preferred prefix comes first (rest keep relative order).
 */
function reorderTypes(
  types: SectionType[],
  preferredPrefix: SectionType[],
): SectionType[] {
  const rest = types.filter((t) => !preferredPrefix.includes(t));
  const prefix = preferredPrefix.filter((t) => types.includes(t));
  return [...prefix, ...rest];
}

/**
 * Builds a fixture narrative from brief facts (never invents).
 */
export function buildFixtureNarrative(brief: Brief): Narrative {
  const dishes = brief.signatureDishes ?? [];
  const awards = brief.awards ?? [];
  const dish = dishes[0] ?? brief.menuItems[0]?.name ?? brief.category;
  const positioning =
    brief.usp?.trim() ||
    `${brief.businessName} — ${dish} in ${brief.neighbourhood ?? brief.category}`;
  return {
    positioning,
    proofPoints: [
      ...dishes.slice(0, 2),
      ...awards.slice(0, 1),
      brief.audience ? `For ${brief.audience}` : "",
    ].filter(Boolean).slice(0, 4),
    voiceRules: [
      "Name concrete dishes and places from the brief",
      "No adjective stacking",
      "Never invent hours, guests, or chefs",
    ],
    avoidPhrases: [
      "authentic experience",
      "culinary journey",
      "feast for the senses",
      "where tradition meets innovation",
      "nestled in the heart of",
      "elevate your dining",
    ],
  };
}

/**
 * LLM art-director call — archetype + sectionPlan + narrative.
 * Returns null on failure so caller can use fixtures.
 */
export async function fetchCreativeDirectionLlm(args: {
  brief: Brief;
  chatText: string;
  family: string;
}): Promise<{
  archetype: Archetype;
  sectionPlan: SectionPlanItem[];
  narrative: Narrative;
  rationale: string;
} | null> {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.parse({
      model: getModelFor("direct"),
      messages: [
        {
          role: "system",
          content: `You are an art director for restaurant websites.
Emit a structured DesignDirection: archetype, ordered sectionPlan, and narrative.
Rules:
- Only use facts from the brief. Never invent testimonials, chefs, hours, or awards.
- Omit testimonials/team/stats from sectionPlan unless brief has that data.
- Always include header, hero, and footer.
- Vary order by archetype (menu_forward leads with menu; story_led with about; etc.).
- Narrative.positioning must be one sentence only this business could say.
- avoidPhrases must include common AI restaurant clichés.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            family: args.family,
            brief: args.brief,
            chatText: args.chatText,
            hasTestimonials: (args.brief.testimonials?.length ?? 0) >= 2,
            hasTeam: (args.brief.team?.length ?? 0) >= 2,
          }),
        },
      ],
      response_format: zodResponseFormat(llmDirectionSchema, "design_direction"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) return null;
    return parsed;
  } catch (error) {
    console.warn(
      "[creativeDirectionLlm]",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
