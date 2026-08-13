import { zodResponseFormat } from "openai/helpers/zod";
import { getModelFor, getOpenAIClient } from "../lib/openai.js";
import { briefSchema, normalizeBrief, type Brief } from "../schemas/brief.schema.js";

const EXTRACT_SYSTEM = `You extract a structured restaurant business brief from a single chat message.
Rules:
- Only include facts explicitly stated by the user. NEVER invent.
- Do NOT invent prices, phone numbers, addresses, hours, testimonials, team, awards, or USPs.
- businessName: ONLY set when the user clearly states a brand/restaurant name (e.g. "called Nonna Rosa", "my Chineeh Cafe", "Restaurant Name: Italinsa").
  Do NOT invent a name from cuisine alone. "italian pasta restaurant" / "X based restaurant" without a clear brand → leave businessName as "".
- menuItems: only dishes with explicit names; price must be a number if stated, otherwise omit the item.
  Parse Indian prices like ₹1,295 or 1295 as numbers (ignore commas/currency symbols).
- photos: only include URLs/paths the user explicitly provided; otherwise [].
- brandColors: color names or #hex the user stated for brand/UI (e.g. "green and cream", "#c9a962"). null if none.
- category: infer from context (e.g. "Italian restaurant", "cafe").
- usp / story / audience / signatureDishes / neighbourhood / vibe / dietary / hours / foundedYear / awards / testimonials / team / socials:
  extract only when explicitly stated; otherwise null or [].`;

/**
 * Stage 1 — LLM: raw chat text → structured brief (Zod-validated).
 */
export async function extractBrief(chatText: string): Promise<Brief> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.parse({
    model: getModelFor("extract"),
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
