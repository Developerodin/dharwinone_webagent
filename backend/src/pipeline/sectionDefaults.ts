import type { Brief } from "../schemas/brief.schema.js";
import { stableHash } from "./pickComponent.js";

type ServiceCard = { title: string; description: string };
type StatItem = { value: string; label: string };
type Testimonial = { quote: string; name: string; role: string };
type TeamMember = { name: string; role: string; bio: string };

const FIRST_NAMES = [
  "Amelia",
  "Noah",
  "Priya",
  "Marcus",
  "Elena",
  "Jonah",
  "Sofia",
  "Kai",
  "Isabel",
  "Omar",
  "Clara",
  "Theo",
] as const;

const LAST_NAMES = [
  "Hayes",
  "Nguyen",
  "Patel",
  "Rivera",
  "Okoye",
  "Brooks",
  "Santos",
  "Kim",
  "Walsh",
  "Ibrahim",
  "Costa",
  "Bernard",
] as const;

const GUEST_ROLES = [
  "Regular Guest",
  "Weekend Diner",
  "Celebration Host",
  "Neighborhood Favorite",
  "Food Writer",
  "Private Dining Guest",
] as const;

const CHEF_ROLES = [
  "Executive Chef",
  "Head Chef",
  "Sous Chef",
  "Pastry Lead",
  "Cuisine Director",
] as const;

/**
 * Picks a deterministic item from a list using a seed hash.
 */
function pickFrom<T>(items: readonly T[], seed: string, salt: number): T {
  const idx = (stableHash(`${seed}:${salt}`) + salt) % items.length;
  return items[idx]!;
}

/**
 * Builds a seeded display name for social-proof / team defaults.
 */
function seededName(seed: string, salt: number): string {
  return `${pickFrom(FIRST_NAMES, seed, salt)} ${pickFrom(LAST_NAMES, seed, salt + 17)}`;
}

/**
 * Default service cards derived from brief category + optional chat cues.
 */
export function defaultServices(brief: Brief, chatText = ""): ServiceCard[] {
  const corpus = `${brief.category} ${chatText}`.toLowerCase();
  const cards: ServiceCard[] = [];

  if (/\b(private\s*dining|private\s*room|vip)\b/.test(corpus)) {
    cards.push({
      title: "Private Dining",
      description: `Intimate rooms and tailored menus for gatherings at ${brief.businessName}.`,
    });
  }
  if (/\b(catering|offsite|event\s*catering)\b/.test(corpus)) {
    cards.push({
      title: "Catering",
      description: `Bring signature ${brief.category} flavors to your next event.`,
    });
  }
  if (/\b(delivery|takeout|take-away|pickup)\b/.test(corpus)) {
    cards.push({
      title: "Takeout & Delivery",
      description: "Order favorites for home without losing the kitchen's care.",
    });
  }
  if (/\b(lunch|brunch)\b/.test(corpus)) {
    cards.push({
      title: "Lunch & Brunch",
      description: `Daytime plates built around ${brief.category} classics.`,
    });
  }
  if (/\b(wedding|celebration|party|events?)\b/.test(corpus)) {
    cards.push({
      title: "Events & Celebrations",
      description: "From milestone dinners to full-venue celebrations.",
    });
  }

  const fallbacks: ServiceCard[] = [
    {
      title: "Seasonal Cooking",
      description: `Ingredient-led ${brief.category} dishes prepared fresh each day.`,
    },
    {
      title: "Thoughtful Hospitality",
      description: "Service paced for conversation, celebration, and ease.",
    },
    {
      title: "Signature Plates",
      description: `House favorites that define the ${brief.businessName} experience.`,
    },
    {
      title: "Warm Atmosphere",
      description: "A dining room shaped for comfort and memorable evenings.",
    },
  ];

  const seed = brief.businessName;
  const rotated = [...fallbacks].sort(
    (a, b) =>
      stableHash(`${seed}:${a.title}`) - stableHash(`${seed}:${b.title}`),
  );

  for (const card of rotated) {
    if (cards.length >= 4) break;
    if (!cards.some((existing) => existing.title === card.title)) {
      cards.push(card);
    }
  }

  return cards.slice(0, 4);
}

/**
 * Default stat counters seeded by business identity (no fake star ratings).
 */
export function defaultStats(brief: Brief): StatItem[] {
  const seed = brief.businessName;
  const dishCount = Math.max(brief.menuItems.length, 8 + (stableHash(seed) % 10));
  const guestBase = 800 + (stableHash(`${seed}:guests`) % 2200);
  const guestLabel =
    guestBase >= 1000
      ? `${(guestBase / 1000).toFixed(1).replace(/\.0$/, "")}k+`
      : `${guestBase}+`;
  const yearSpan = 5 + (stableHash(`${seed}:years`) % 20);

  return [
    { value: guestLabel, label: "Guests Hosted" },
    { value: String(dishCount), label: "Menu Favorites" },
    { value: `${yearSpan}+`, label: "Years of Craft" },
    {
      value: pickFrom(["Daily", "Seasonal", "Local", "House"], seed, 3),
      label: "Kitchen Rhythm",
    },
  ];
}

/**
 * Default guest testimonials with seeded names/roles (not the same trio every time).
 */
export function defaultTestimonials(brief: Brief): Testimonial[] {
  const seed = brief.businessName;
  const quotes = [
    `${brief.businessName} delivered an unforgettable meal — generous flavor and seamless service.`,
    `From the first course to the last, every detail at this ${brief.category} felt intentional.`,
    `Warm hospitality and dishes that taste as good as they look. We already planned our return.`,
  ];

  return quotes.map((quote, index) => ({
    quote,
    name: seededName(seed, index * 3),
    role: pickFrom(GUEST_ROLES, seed, index * 5),
  }));
}

/**
 * Default chef/team members with seeded identities.
 */
export function defaultTeam(brief: Brief): TeamMember[] {
  const seed = brief.businessName;
  const bios = [
    `Leads the kitchen at ${brief.businessName} with a focus on seasonal ${brief.category}.`,
    "Brings precision technique and creative plating to every service.",
    "Crafts refined finishes that close each meal on a high note.",
  ];
  return [0, 1, 2].map((index) => ({
    name: seededName(seed, index * 11 + 2),
    role: pickFrom(CHEF_ROLES, seed, index * 7),
    bio: bios[index]!,
  }));
}
