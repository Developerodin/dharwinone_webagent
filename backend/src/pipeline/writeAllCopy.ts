import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { PageFamily } from "../config/pageFamily.js";
import { getModelFor, getOpenAIClient } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { CreativeDirection } from "../schemas/creativeDirection.schema.js";
import { getManifest } from "../schemas/manifest.schema.js";
import { getSpec } from "../catalog/index.js";
import type { SectionType } from "../schemas/page.schema.js";
import { factCheck } from "./factCheck.js";
import { slopCheck } from "./slopCheck.js";
import { COPY_SKILL } from "./designSkillPrompt.js";
import { writeCopyFixture } from "./writeCopy.js";

export type PlannedCopySection = {
  sectionType: SectionType;
  componentId: string;
};

/**
 * Writes fixture copy for every planned section (no LLM).
 */
export async function writeAllSectionCopyFixture(
  sections: PlannedCopySection[],
  brief: Brief,
  family: PageFamily,
): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const { sectionType, componentId } of sections) {
    out[sectionType] = writeCopyFixture({ componentId, brief, family });
  }
  return out;
}

/**
 * One batched LLM call for all section copy, guided by narrative + section plan.
 */
export async function writeAllSectionCopy(args: {
  brief: Brief;
  direction: CreativeDirection;
  sections: PlannedCopySection[];
  useFixture?: boolean;
}): Promise<Record<string, Record<string, unknown>>> {
  const family = args.direction.family;
  if (args.useFixture) {
    return writeAllSectionCopyFixture(args.sections, args.brief, family);
  }

  const sectionSpecs = args.sections.map(({ sectionType, componentId }) => {
    const manifest = getManifest(componentId);
    const planItem = args.direction.sectionPlan?.find(
      (item) => item.type === sectionType,
    );
    // A migrated component states its own content contract — which fields it
    // renders, whether each is required, and the character budget its layout
    // was designed around. Everything else falls back to the section-wide
    // manifest, which is the same list for every variant.
    const spec = getSpec(componentId);
    const fields = spec
      ? Object.entries(spec.slots).map(([name, slot]) => ({
          name,
          required: slot.required,
          maxChars: slot.maxChars,
          hint: slot.hint,
        }))
      : manifest.copyFields.map((name) => ({
          name,
          required: true,
          maxChars: undefined,
          hint: undefined,
        }));

    return {
      sectionType,
      componentId,
      fields,
      layoutFamily: spec?.layoutFamily,
      emphasis: planItem?.emphasis ?? "standard",
      layoutIntent: planItem?.layoutIntent ?? "full_bleed",
    };
  });

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const spec of sectionSpecs) {
    const fieldShape: Record<string, z.ZodString> = {};
    for (const field of spec.fields) {
      // Budgets are stated in the prompt and checked after parsing rather than
      // encoded as JSON-schema maxLength, which structured output rejects.
      fieldShape[field.name] = z.string();
    }
    shape[spec.sectionType] = z.object(fieldShape);
  }
  const batchSchema = z.object(shape);

  const banned = [
    "authentic experience",
    "culinary journey",
    "a feast for the senses",
    "where tradition meets innovation",
    "nestled in the heart of",
    "elevate your dining",
    ...(args.direction.narrative?.avoidPhrases ?? []),
  ];

  /**
   * Runs one batch generation attempt.
   */
  async function attempt(flagNote: string): Promise<Record<string, Record<string, unknown>>> {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.parse({
      model: getModelFor("copy"),
      messages: [
        {
          role: "system",
          content: `${COPY_SKILL}

You write all section copy for one restaurant page in a single response.
Rules:
- Use ONLY facts in the brief. Never invent hours, phone, prices, chefs, guests, or awards.
- Follow the narrative positioning, proofPoints, and voiceRules.
- Serve the signature (${args.direction.signature?.note ?? "one memorable idea"}) — other sections stay quieter.
- Banned phrases: ${banned.join("; ")}.
- Every headline must contain a concrete noun from the brief (dish, place, year, technique).
- If usp/audience are present, they steer voice and who the copy is for — do not genericize them away or print "USP:" / "Audience:" labels.
- Every field has a hard character budget in \`sections[].fields[].maxChars\`. Stay under it — the component's layout was designed around that length and longer copy breaks it.
- Fields marked required must be non-empty; optional fields may be an empty string when there is nothing true to say.
- eyebrow fields: return an empty string.
- Return an object keyed by sectionType with the listed fields.
${flagNote}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            brief: args.brief,
            narrative: args.direction.narrative,
            signature: args.direction.signature,
            subject: args.direction.subject,
            archetype: args.direction.archetype,
            family,
            sections: sectionSpecs,
          }),
        },
      ],
      response_format: zodResponseFormat(batchSchema, "all_section_copy"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("Batched copy returned empty response");
    }
    return parsed as Record<string, Record<string, unknown>>;
  }

  try {
    let copy = await attempt("");
    const flagged: string[] = [];
    for (const { sectionType } of args.sections) {
      const sectionCopy = copy[sectionType] ?? {};
      const facts = factCheck({ copy: sectionCopy, brief: args.brief });
      if (!facts.ok) flagged.push(...facts.flaggedSpans);
      const slop = slopCheck(sectionCopy);
      if (!slop.ok) flagged.push(...slop.matches);
    }
    if (flagged.length > 0) {
      copy = await attempt(
        `\nIMPORTANT: Previous batch failed checks: ${flagged.join(", ")}. Fix and never invent facts.`,
      );
    }

    // Fill any missing sections from fixtures (empty strings, not fabricated prose beyond fixtures).
    for (const { sectionType, componentId } of args.sections) {
      if (!copy[sectionType]) {
        copy[sectionType] = writeCopyFixture({
          componentId,
          brief: args.brief,
          family,
        });
      }
    }
    return copy;
  } catch (error) {
    console.warn(
      "[writeAllCopy] falling back to fixtures:",
      error instanceof Error ? error.message : error,
    );
    return writeAllSectionCopyFixture(args.sections, args.brief, family);
  }
}
