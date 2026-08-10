import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import { getManifest } from "../schemas/manifest.schema.js";

/**
 * Builds a dynamic Zod schema for the manifest copy fields.
 */
function buildCopySchema(fieldNames: readonly string[]) {
  const shape: Record<string, z.ZodString> = {};
  for (const field of fieldNames) {
    shape[field] = z.string().min(1);
  }
  return z.object(shape);
}

/**
 * Stage 4 — LLM: fill component manifest fields per section.
 */
export async function writeCopy(args: {
  sectionType: string;
  componentId: string;
  brief: Brief;
  flaggedSpans?: string[];
}): Promise<Record<string, unknown>> {
  const manifest = getManifest(args.componentId);
  const copySchema = buildCopySchema(manifest.copyFields);

  const retryNote =
    args.flaggedSpans && args.flaggedSpans.length > 0
      ? `\nIMPORTANT: Your previous copy included invented facts: ${args.flaggedSpans.join(", ")}. Remove or rephrase them. Do NOT include any prices, phone numbers, or hours unless they appear in the brief below.`
      : "";

  const systemPrompt = `You write marketing copy for a restaurant website section.
Rules:
- Fill ONLY these fields: ${manifest.copyFields.join(", ")}.
- Use facts from the brief; do NOT invent prices, phone numbers, addresses, or hours.
- Write in a warm, premium tone specific to this business.
- Keep headlines concise.${retryNote}`;

  const userPrompt = `Business brief:
${JSON.stringify(args.brief, null, 2)}

Section type: ${args.sectionType}
Component: ${args.componentId}`;

  const client = getOpenAIClient();
  const completion = await client.chat.completions.parse({
    model: getOpenAIModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(copySchema, "section_copy"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error(`Copy generation failed for ${args.componentId}`);
  }

  return manifest.contentSchema.parse(parsed) as Record<string, unknown>;
}

/**
 * Deterministic copy for fixture mode (no LLM tokens).
 * Keys off section type + family so all *-NN variants share fixtures.
 */
export function writeCopyFixture(args: {
  componentId: string;
  brief: Brief;
}): Record<string, unknown> {
  const { brief } = args;
  const manifest = getManifest(args.componentId);
  const isElegant = args.componentId.startsWith("elegant-");

  switch (manifest.sectionType) {
    case "hero":
      return isElegant
        ? {
            headline: brief.businessName,
            subheading: `An elegant ${brief.category} experience crafted for the discerning palate`,
            ctaLabel: "Reserve a Table",
          }
        : {
            headline: brief.businessName,
            subheading: `Authentic ${brief.category} experience`,
            ctaLabel: "View Menu",
          };
    case "menu":
      return isElegant
        ? {
            sectionTitle: "Chef's Selection",
            introText:
              "Seasonal ingredients, refined technique, unforgettable flavor.",
          }
        : {
            sectionTitle: "Our Menu",
            introText: "Seasonal dishes crafted with care.",
          };
    case "about":
      return isElegant
        ? {
            headline: "Our Story",
            body: `${brief.businessName} celebrates the art of ${brief.category} with timeless hospitality and cuisine rooted in tradition.`,
          }
        : {
            headline: `About ${brief.businessName}`,
            body: `Welcome to ${brief.businessName}, a ${brief.category} rooted in tradition and quality ingredients.`,
          };
    case "gallery":
      return isElegant
        ? {
            headline: "The Experience",
            caption:
              "A glimpse into our dining room, kitchen, and plated artistry.",
          }
        : {
            headline: "Gallery",
            caption: "A glimpse into our kitchen and dining room.",
          };
    case "location_map":
      return isElegant
        ? {
            headline: "Visit & Reserve",
            directionsNote:
              "We welcome guests by reservation. Join us for an evening of refined dining.",
          }
        : {
            headline: "Visit Us",
            directionsNote: "We look forward to hosting you.",
          };
    case "services":
      return isElegant
        ? {
            headline: "What We Offer",
            introText:
              "Thoughtful hospitality and refined cuisine in every detail.",
          }
        : {
            headline: "Restaurant Services",
            introText: "Everything you need for a memorable meal out.",
          };
    case "stats":
      return isElegant
        ? { headline: "Numbers That Speak" }
        : { headline: "Loved By Our Guests" };
    case "testimonials":
      return isElegant
        ? {
            headline: "What Guests Are Saying",
            introText:
              "From intimate dinners to celebrations, guests return for the craft and care.",
          }
        : {
            headline: "Our Clients Choose Us",
            introText: "Real words from guests who dined with us.",
          };
    case "team":
      return isElegant
        ? {
            headline: "Meet The Culinary Team",
            introText: "Chefs who bring tradition and refinement to every plate.",
          }
        : {
            headline: "Group of Professional Chefs",
            introText: "The people behind the flavors you love.",
          };
    case "reservation":
      return isElegant
        ? {
            headline: "Reserve Your Evening",
            body: "Book a table for an unforgettable dining journey.",
            ctaLabel: "Book A Table",
          }
        : {
            headline: "Book Your Table",
            body: "Reserve your spot and enjoy a seamless dining experience.",
            ctaLabel: "Reserve Now",
          };
    case "header":
      return {
        brandName: brief.businessName,
        tagline: isElegant
          ? "Fine Dining"
          : `Restaurant · ${brief.category}`,
      };
    case "contact":
      return isElegant
        ? {
            headline: "Contact / Reservation",
            introText: "Share your details and we will confirm your table.",
            ctaLabel: "Submit Request",
          }
        : {
            headline: "Get In Touch",
            introText: "Questions, bookings, or private events — we are here.",
            ctaLabel: "Send Message",
          };
    case "footer":
      return {
        tagline: isElegant
          ? "An evening of refined hospitality"
          : `Thank you for visiting ${brief.businessName}`,
        copyright: `© ${new Date().getFullYear()} ${brief.businessName}. All rights reserved.`,
      };
    default:
      throw new Error(`No fixture copy for ${args.componentId}`);
  }
}
