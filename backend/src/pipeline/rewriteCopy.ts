import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { SectionType } from "../schemas/page.schema.js";

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
}): Promise<string> {
  const client = getOpenAIClient();
  const maxWords = args.maxWords ?? (args.field === "headline" ? 10 : 18);

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `You write short restaurant website copy.
Return ONLY the new ${args.field} text — no quotes, no preamble.
Respect max ${maxWords} words.
Match the restaurant vibe; do not invent false claims (Michelin, awards, etc.).`,
      },
      {
        role: "user",
        content: `Restaurant: ${args.brief.businessName} (${args.brief.category})
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

  // Strip wrapping quotes the model sometimes adds
  return text.replace(/^["“']+|["”']+$/g, "").trim();
}
