import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getModelFor, getOpenAIClient } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import {
  archetypeSchema,
  creativePaletteSchema,
  designModeSchema,
  designSignatureSchema,
  designSubjectSchema,
  narrativeSchema,
  sectionPlanItemSchema,
  type Archetype,
  type CreativePalette,
  type DesignMode,
  type DesignSignature,
  type DesignSubject,
  type Narrative,
  type SectionPlanItem,
} from "../schemas/creativeDirection.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import { DIRECTOR_SKILL } from "./designSkillPrompt.js";
import { ARCHETYPE_OUTCOMES, ARCHETYPE_RULES } from "./archetypeRules.js";
import { classifyBySignals, type ClassifyResult } from "./signalScoring.js";
import { listDistinctiveTypePairs } from "./horecaDesignSystem.js";
import { planSections } from "./planSections.js";

const llmPaletteSchema = creativePaletteSchema.pick({
  accent: true,
  bg: true,
  bgAlt: true,
  ink: true,
});

const llmDirectionSchema = z.object({
  archetype: archetypeSchema,
  sectionPlan: z.array(sectionPlanItemSchema).min(5).max(16),
  narrative: narrativeSchema,
  rationale: z.string().min(1),
  mode: designModeSchema,
  subject: designSubjectSchema,
  signature: designSignatureSchema,
  palette: llmPaletteSchema.optional(),
  typePairId: z.string().optional(),
});

export type LlmCreativeDirection = {
  archetype: Archetype;
  sectionPlan: SectionPlanItem[];
  narrative: Narrative;
  rationale: string;
  mode: DesignMode;
  subject: DesignSubject;
  signature: DesignSignature;
  palette?: Pick<CreativePalette, "accent" | "bg" | "bgAlt" | "ink">;
  typePairId?: string;
};

/**
 * Infers persuade vs experience from archetype and brief cues.
 */
export function inferMode(archetype: Archetype, brief: Brief, chatText: string): DesignMode {
  const corpus = `${brief.category} ${brief.vibe?.join(" ") ?? ""} ${chatText}`.toLowerCase();
  if (archetype === "visual_immersive" || /\b(gallery|immersive|rooftop|cocktail)\b/.test(corpus)) {
    return "experience";
  }
  return "persuade";
}

/**
 * Locks subject from brief facts only (never invents a USP).
 */
export function buildFixtureSubject(brief: Brief): DesignSubject {
  const place = brief.neighbourhood ?? brief.address?.split(",").at(-1)?.trim() ?? brief.category;
  return {
    what: `${brief.businessName} — ${brief.category}`,
    audience: brief.audience?.trim() || "diners choosing where to eat tonight",
    pageJob: brief.usp?.trim()
      ? `Convince them to book: ${brief.usp.trim()}`
      : `Get them to the table at ${place}`,
  };
}

/**
 * Picks the one memorable section for this archetype.
 */
export function buildFixtureSignature(
  brief: Brief,
  archetype: Archetype,
): DesignSignature {
  if (archetype === "menu_forward") {
    const dish = brief.signatureDishes?.[0] ?? brief.menuItems[0]?.name ?? "the menu";
    return {
      kind: "menu_as_thesis",
      section: "menu",
      note: `Lead with ${dish} — the page is the kitchen.`,
    };
  }
  if (archetype === "story_led") {
    return {
      kind: "story_as_thesis",
      section: "about",
      note: "The origin story is the memorable device; keep other sections quiet.",
    };
  }
  if (archetype === "visual_immersive") {
    return {
      kind: "gallery_as_thesis",
      section: "gallery",
      note: "Let photography lead; type and chrome recede.",
    };
  }
  if (archetype === "reservation_first") {
    return {
      kind: "booking_as_thesis",
      section: "reservation",
      note: "The page exists to book a table.",
    };
  }
  return {
    kind: "hero_thesis",
    section: "hero",
    note: "Hero names one concrete dish, place, or craft from the brief.",
  };
}

/**
 * Boosts the signature section; numbered-sequence layouts stay on stats only.
 */
export function applySignatureToSectionPlan(
  plan: SectionPlanItem[],
  signature: DesignSignature,
): SectionPlanItem[] {
  return plan.map((item) => {
    if (item.type !== signature.section) return item;
    const emphasis =
      item.type === "hero" ? "hero" : item.emphasis === "compact" ? "major" : "major";
    return { ...item, emphasis, spacing: "roomy" };
  });
}

/**
 * Builds the text corpus used for archetype and site classification.
 */
export function classificationCorpus(brief: Brief, chatText: string): string {
  return [
    brief.category,
    brief.audience ?? "",
    brief.usp ?? "",
    brief.story ?? "",
    (brief.vibe ?? []).join(" "),
    chatText,
  ].join(" ");
}

/**
 * Infers the page archetype from the balance of signals in the brief.
 *
 * Replaces an ordered if-chain in which the first matching keyword won
 * outright: a fine-dining omakase counter classified as quick service because
 * its USP contained the word "counter".
 */
export function inferArchetype(brief: Brief, chatText: string): Archetype {
  return classifyArchetype(brief, chatText).outcome;
}

/**
 * Archetype classification with the full score breakdown, for tracing.
 */
export function classifyArchetype(
  brief: Brief,
  chatText: string,
): ClassifyResult<Archetype> {
  return classifyBySignals<Archetype>({
    rules: ARCHETYPE_RULES,
    outcomes: ARCHETYPE_OUTCOMES,
    brief,
    corpus: classificationCorpus(brief, chatText),
    fallback: "neighbourhood",
    minimumScore: 2,
  });
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

  const plan: SectionPlanItem[] = types.map((type) => ({
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
  return applySignatureToSectionPlan(plan, buildFixtureSignature(brief, archetype));
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
 * LLM art-director call — mode, signature, palette, type, plan, narrative.
 * Returns null on failure so caller can use fixtures.
 */
export async function fetchCreativeDirectionLlm(args: {
  brief: Brief;
  chatText: string;
  family: string;
}): Promise<LlmCreativeDirection | null> {
  const typePairs = listDistinctiveTypePairs().map((pair) => ({
    id: pair.id,
    heading: pair.headingFont,
    body: pair.bodyFont,
    mood: pair.mood,
  }));

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.parse({
      model: getModelFor("direct"),
      messages: [
        {
          role: "system",
          content: `${DIRECTOR_SKILL}

Emit structured DesignDirection.
Rules:
- Only use facts from the brief. Never invent testimonials, chefs, hours, or awards.
- Omit testimonials/team/stats from sectionPlan unless brief has that data.
- Always include header, hero, and footer.
- Vary order by archetype (menu_forward leads with menu; story_led with about; etc.).
- signature.section must exist in sectionPlan; give it emphasis major or hero.
- typePairId MUST be one of the allowed ids.
- palette hexes must not be cream+terracotta unless brandColors or chat asked.
- Narrative.positioning must be one sentence only this business could say.
- If brief.usp is set, positioning MUST echo it (paraphrase allowed, new claims are not).
- If brief.audience is set, subject.audience must use it.
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
            allowedTypePairs: typePairs,
          }),
        },
      ],
      response_format: zodResponseFormat(llmDirectionSchema, "design_direction"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) return null;
    const allowedIds = new Set(typePairs.map((pair) => pair.id));
    const typePairId =
      parsed.typePairId && allowedIds.has(parsed.typePairId)
        ? parsed.typePairId
        : undefined;
    return {
      ...parsed,
      typePairId,
      sectionPlan: applySignatureToSectionPlan(parsed.sectionPlan, parsed.signature),
    };
  } catch (error) {
    console.warn(
      "[creativeDirectionLlm]",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
