import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import { briefSchema, normalizeBrief, type Brief } from "../schemas/brief.schema.js";

const EXTRACT_SYSTEM = `You extract a structured restaurant business brief from a single chat message.
Rules:
- Only include facts explicitly stated by the user.
- Do NOT invent prices, phone numbers, addresses, or hours.
- businessName: ONLY set when the user clearly states a brand/restaurant name (e.g. "called Nonna Rosa", "my Chineeh Cafe", "Restaurant Name: Italinsa").
  Do NOT invent a name from cuisine alone. "italian pasta restaurant" / "X based restaurant" without a clear brand → leave businessName as "".
- menuItems: only dishes with explicit names; price must be a number if stated, otherwise omit the item.
  Parse Indian prices like ₹1,295 or 1295 as numbers (ignore commas/currency symbols).
- photos: leave empty (uploads happen later in the editor).
- category: infer from context (e.g. "Italian restaurant", "cafe").`;

/**
 * Stage 1 — LLM: raw chat text → structured brief (Zod-validated).
 */
export async function extractBrief(chatText: string): Promise<Brief> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.parse({
    model: getOpenAIModel(),
    messages: [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: chatText },
    ],
    response_format: zodResponseFormat(briefSchema, "brief"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("Brief extraction failed: empty structured response");
  }

  return normalizeBrief(briefSchema.parse(parsed));
}
