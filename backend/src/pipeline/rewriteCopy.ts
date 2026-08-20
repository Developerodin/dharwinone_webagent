import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { Narrative } from "../schemas/creativeDirection.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import { REWRITE_SKILL } from "./designSkillPrompt.js";

/**
 * Generates replacement copy for a section field when the user asks
 * to rewrite without providing the exact new text.
 */
export async function rewriteSectionCopy(args: {
  brief: Brief;
  section: SectionType;
  field: string;
  currentValue: string;
  instruction: string;
  maxWords: number | null;
  narrative?: Narrative | null;
}): Promise<string> {
  const client = getOpenAIClient();
  const maxWords = args.maxWords ?? (args.field === "headline" ? 10 : 18);
  const voice = args.narrative
    ? `Positioning: ${args.narrative.positioning}
Voice: ${args.narrative.voiceRules.join("; ")}
Avoid: ${args.narrative.avoidPhrases.join("; ")}`
    : "";

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `${REWRITE_SKILL}
Return ONLY the new ${args.field} text — no quotes, no preamble.
Respect max ${maxWords} words.`,
      },
      {
        role: "user",
        content: `Restaurant: ${args.brief.businessName} (${args.brief.category})
USP: ${args.brief.usp?.trim() || "(none stated)"}
Audience: ${args.brief.audience?.trim() || "(none stated)"}
${voice}
Section: ${args.section}
Field: ${args.field}
Current: ${args.currentValue || "(empty)"}
User ask: ${args.instruction}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error("Rewrite produced empty copy");
  }

  return text.replace(/^["“']+|["”']+$/g, "").trim();
}
