import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { PageFamily } from "../config/pageFamily.js";
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
 * Family-specific voice guidance for LLM copy.
 */
function toneForFamily(family: PageFamily): string {
  switch (family) {
    case "elegant":
      return "restrained luxury — precise, polished, never loud";
    case "rustic":
      return "warm and grounded — hearth, craft, honest hospitality";
    case "vibrant":
      return "energetic and vivid — lively, colorful, inviting";
    case "minimal":
      return "sparse modern — clean, understated, few adjectives";
    case "premium":
    default:
      return "warm premium — welcoming, refined, specific to this business";
  }
}

/**
 * Resolves page family from an explicit arg or component id prefix.
 */
function resolveFamily(
  family: PageFamily | undefined,
  componentId: string,
): PageFamily {
  if (family) return family;
  const prefix = componentId.split("-")[0];
  if (
    prefix === "elegant" ||
    prefix === "minimal" ||
    prefix === "rustic" ||
    prefix === "vibrant" ||
    prefix === "premium"
  ) {
    return prefix;
  }
  return "premium";
}

/**
 * Stage 4 — LLM: fill component manifest fields per section.
 */
export async function writeCopy(args: {
  sectionType: string;
  componentId: string;
  brief: Brief;
  family?: PageFamily;
  flaggedSpans?: string[];
}): Promise<Record<string, unknown>> {
  const manifest = getManifest(args.componentId);
  const copySchema = buildCopySchema(manifest.copyFields);
  const family = resolveFamily(args.family, args.componentId);

  const retryNote =
    args.flaggedSpans && args.flaggedSpans.length > 0
      ? `\nIMPORTANT: Your previous copy included invented facts: ${args.flaggedSpans.join(", ")}. Remove or rephrase them. Do NOT include any prices, phone numbers, or hours unless they appear in the brief below.`
      : "";

  const headerRules =
    args.sectionType === "header"
      ? `
Header-specific rules:
- tagline: 6–12 words; must mention cuisine and/or location from the brief.
- Never use generic filler like "Fine Dining", "Authentic Experience", or "Restaurant · …".
- ctaLabel: a short booking verb phrase (e.g. "Reserve a Table").
- eyebrow: a short cuisine/vibe label from the brief (not "Premium Collection").`
      : "";

  const systemPrompt = `You write marketing copy for a restaurant website section.
Rules:
- Fill ONLY these fields: ${manifest.copyFields.join(", ")}.
- Use facts from the brief; do NOT invent prices, phone numbers, addresses, or hours.
- Write in this voice: ${toneForFamily(family)}.
- Keep headlines concise and specific to ${args.brief.businessName}.${headerRules}${retryNote}`;

  const userPrompt = `Business brief:
${JSON.stringify(args.brief, null, 2)}

Section type: ${args.sectionType}
Component: ${args.componentId}
Theme family: ${family}`;

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
 * Keys off section type + family so themes diverge in voice.
 */
export function writeCopyFixture(args: {
  componentId: string;
  brief: Brief;
  family?: PageFamily;
}): Record<string, unknown> {
  const { brief } = args;
  const manifest = getManifest(args.componentId);
  const family = resolveFamily(args.family, args.componentId);
  const place = brief.address
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);

  switch (manifest.sectionType) {
    case "hero":
      return heroFixture(family, brief);
    case "menu":
      return menuFixture(family);
    case "about":
      return aboutFixture(family, brief);
    case "gallery":
      return galleryFixture(family);
    case "location_map":
      return locationFixture(family);
    case "services":
      return servicesFixture(family);
    case "stats":
      return statsFixture(family);
    case "testimonials":
      return testimonialsFixture(family);
    case "team":
      return teamFixture(family);
    case "reservation":
      return reservationFixture(family);
    case "header": {
      const tagline = headerTaglineFixture(family, brief, place);
      return {
        brandName: brief.businessName,
        tagline,
        ctaLabel: "Reserve a Table",
        eyebrow: brief.category,
      };
    }
    case "contact":
      return contactFixture(family);
    case "footer":
      return {
        tagline: footerTaglineFixture(family, brief),
        copyright: `© ${new Date().getFullYear()} ${brief.businessName}. All rights reserved.`,
      };
    default:
      throw new Error(`No fixture copy for ${args.componentId}`);
  }
}

/**
 * Hero fixture copy by family voice.
 */
function heroFixture(family: PageFamily, brief: Brief) {
  switch (family) {
    case "elegant":
      return {
        headline: brief.businessName,
        subheading: `An elegant ${brief.category} experience crafted for the discerning palate`,
        ctaLabel: "Reserve a Table",
      };
    case "rustic":
      return {
        headline: brief.businessName,
        subheading: `Heartfelt ${brief.category} from a kitchen that cooks with care`,
        ctaLabel: "See the Menu",
      };
    case "vibrant":
      return {
        headline: brief.businessName,
        subheading: `Bold ${brief.category} flavors made for sharing and celebrating`,
        ctaLabel: "Explore Dishes",
      };
    case "minimal":
      return {
        headline: brief.businessName,
        subheading: `${brief.category}. Clear flavors. Calm room.`,
        ctaLabel: "View Menu",
      };
    default:
      return {
        headline: brief.businessName,
        subheading: `Authentic ${brief.category} experience`,
        ctaLabel: "View Menu",
      };
  }
}

/**
 * Menu fixture copy by family voice.
 */
function menuFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        sectionTitle: "Chef's Selection",
        introText:
          "Seasonal ingredients, refined technique, unforgettable flavor.",
      };
    case "rustic":
      return {
        sectionTitle: "From Our Kitchen",
        introText: "Simple plates, honest ingredients, familiar comfort.",
      };
    case "vibrant":
      return {
        sectionTitle: "What's Cooking",
        introText: "Bright flavors and shareable plates worth gathering for.",
      };
    case "minimal":
      return {
        sectionTitle: "Menu",
        introText: "A focused list of dishes we cook well.",
      };
    default:
      return {
        sectionTitle: "Our Menu",
        introText: "Seasonal dishes crafted with care.",
      };
  }
}

/**
 * About fixture copy by family voice.
 */
function aboutFixture(family: PageFamily, brief: Brief) {
  switch (family) {
    case "elegant":
      return {
        headline: "Our Story",
        body: `${brief.businessName} celebrates the art of ${brief.category} with timeless hospitality and cuisine rooted in tradition.`,
      };
    case "rustic":
      return {
        headline: `Welcome to ${brief.businessName}`,
        body: `A neighborhood ${brief.category} built on slow cooking, warm tables, and recipes passed hand to hand.`,
      };
    case "vibrant":
      return {
        headline: `Meet ${brief.businessName}`,
        body: `${brief.businessName} brings lively ${brief.category} energy — colorful plates, big flavor, and an easy welcome.`,
      };
    case "minimal":
      return {
        headline: brief.businessName,
        body: `A quiet ${brief.category} focused on clarity, seasonality, and good company.`,
      };
    default:
      return {
        headline: `About ${brief.businessName}`,
        body: `Welcome to ${brief.businessName}, a ${brief.category} rooted in tradition and quality ingredients.`,
      };
  }
}

/**
 * Gallery fixture copy by family voice.
 */
function galleryFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        headline: "The Experience",
        caption:
          "A glimpse into our dining room, kitchen, and plated artistry.",
      };
    case "rustic":
      return {
        headline: "Around the Table",
        caption: "Hearth, harvest, and the plates we share.",
      };
    case "vibrant":
      return {
        headline: "Color & Craft",
        caption: "Snapshots of dishes, nights, and the room in motion.",
      };
    case "minimal":
      return {
        headline: "Gallery",
        caption: "Selected views of the room and the plate.",
      };
    default:
      return {
        headline: "Gallery",
        caption: "A glimpse into our kitchen and dining room.",
      };
  }
}

/**
 * Location fixture copy by family voice.
 */
function locationFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        headline: "Visit & Reserve",
        directionsNote:
          "We welcome guests by reservation. Join us for an evening of refined dining.",
      };
    case "rustic":
      return {
        headline: "Find Us",
        directionsNote: "Pull up a chair — we are glad you made the trip.",
      };
    case "vibrant":
      return {
        headline: "Come Through",
        directionsNote: "Walk in or book ahead — the table is ready for you.",
      };
    case "minimal":
      return {
        headline: "Visit",
        directionsNote: "We look forward to hosting you.",
      };
    default:
      return {
        headline: "Visit Us",
        directionsNote: "We look forward to hosting you.",
      };
  }
}

/**
 * Services fixture copy by family voice.
 */
function servicesFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        headline: "What We Offer",
        introText:
          "Thoughtful hospitality and refined cuisine in every detail.",
      };
    case "rustic":
      return {
        headline: "How We Host",
        introText: "From weeknight tables to gatherings that feel like home.",
      };
    case "vibrant":
      return {
        headline: "More Ways to Enjoy",
        introText: "Group nights, catering, and flavors built for sharing.",
      };
    case "minimal":
      return {
        headline: "Services",
        introText: "Dining, hosting, and a few essentials done well.",
      };
    default:
      return {
        headline: "Restaurant Services",
        introText: "Everything you need for a memorable meal out.",
      };
  }
}

/**
 * Stats fixture copy by family voice.
 */
function statsFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return { headline: "Numbers That Speak" };
    case "rustic":
      return { headline: "Years at the Table" };
    case "vibrant":
      return { headline: "The Buzz" };
    case "minimal":
      return { headline: "At a Glance" };
    default:
      return { headline: "Loved By Our Guests" };
  }
}

/**
 * Testimonials fixture copy by family voice.
 */
function testimonialsFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        headline: "What Guests Are Saying",
        introText:
          "From intimate dinners to celebrations, guests return for the craft and care.",
      };
    case "rustic":
      return {
        headline: "Words From the Neighborhood",
        introText: "Guests who come for comfort and stay for the welcome.",
      };
    case "vibrant":
      return {
        headline: "Guest Love",
        introText: "Notes from nights that went long and plates that emptied.",
      };
    case "minimal":
      return {
        headline: "Guests",
        introText: "A few words from people who dined with us.",
      };
    default:
      return {
        headline: "Our Clients Choose Us",
        introText: "Real words from guests who dined with us.",
      };
  }
}

/**
 * Team fixture copy by family voice.
 */
function teamFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        headline: "Meet The Culinary Team",
        introText: "Chefs who bring tradition and refinement to every plate.",
      };
    case "rustic":
      return {
        headline: "The People in the Kitchen",
        introText: "Cooks who treat every service like a family meal.",
      };
    case "vibrant":
      return {
        headline: "The Crew",
        introText: "The hands and energy behind the flavors you love.",
      };
    case "minimal":
      return {
        headline: "Team",
        introText: "The cooks behind the menu.",
      };
    default:
      return {
        headline: "Group of Professional Chefs",
        introText: "The people behind the flavors you love.",
      };
  }
}

/**
 * Reservation fixture copy by family voice.
 */
function reservationFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        headline: "Reserve Your Evening",
        body: "Book a table for an unforgettable dining journey.",
        ctaLabel: "Book A Table",
      };
    case "rustic":
      return {
        headline: "Save Your Seat",
        body: "Reserve a table and settle in for an honest meal.",
        ctaLabel: "Book a Table",
      };
    case "vibrant":
      return {
        headline: "Grab a Table",
        body: "Lock in your night — good food, good people, good energy.",
        ctaLabel: "Reserve Now",
      };
    case "minimal":
      return {
        headline: "Reservations",
        body: "Book a table for your next visit.",
        ctaLabel: "Reserve",
      };
    default:
      return {
        headline: "Book Your Table",
        body: "Reserve your spot and enjoy a seamless dining experience.",
        ctaLabel: "Reserve Now",
      };
  }
}

/**
 * Header tagline fixture by family voice.
 */
function headerTaglineFixture(
  family: PageFamily,
  brief: Brief,
  place: string | undefined,
): string {
  switch (family) {
    case "elegant":
      return place
        ? `Refined ${brief.category} in ${place}`
        : `Refined ${brief.category} for memorable evenings`;
    case "rustic":
      return place
        ? `Homestyle ${brief.category} in ${place}`
        : `Homestyle ${brief.category} worth the trip`;
    case "vibrant":
      return place
        ? `Lively ${brief.category} in ${place}`
        : `Lively ${brief.category} made for sharing`;
    case "minimal":
      return place
        ? `${brief.category} in ${place}`
        : `${brief.category}, simply done`;
    default:
      return place
        ? `${brief.category} in ${place}`
        : `${brief.category} worth seeking out`;
  }
}

/**
 * Contact fixture copy by family voice.
 */
function contactFixture(family: PageFamily) {
  switch (family) {
    case "elegant":
      return {
        headline: "Contact / Reservation",
        introText: "Share your details and we will confirm your table.",
        ctaLabel: "Submit Request",
      };
    case "rustic":
      return {
        headline: "Say Hello",
        introText: "Questions or bookings — send a note and we will reply.",
        ctaLabel: "Send Message",
      };
    case "vibrant":
      return {
        headline: "Get In Touch",
        introText: "Bookings, parties, or just saying hi — drop us a line.",
        ctaLabel: "Send It",
      };
    case "minimal":
      return {
        headline: "Contact",
        introText: "Reach out for reservations or questions.",
        ctaLabel: "Send",
      };
    default:
      return {
        headline: "Get In Touch",
        introText: "Questions, bookings, or private events — we are here.",
        ctaLabel: "Send Message",
      };
  }
}

/**
 * Footer tagline fixture by family voice.
 */
function footerTaglineFixture(family: PageFamily, brief: Brief): string {
  switch (family) {
    case "elegant":
      return "An evening of refined hospitality";
    case "rustic":
      return "Good food, warm tables, glad you stopped by";
    case "vibrant":
      return "Come hungry. Leave happy.";
    case "minimal":
      return `${brief.businessName}`;
    default:
      return `Thank you for visiting ${brief.businessName}`;
  }
}
