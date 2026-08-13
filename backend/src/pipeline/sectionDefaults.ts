import type { Brief } from "../schemas/brief.schema.js";

type ServiceCard = { title: string; description: string };
type StatItem = { value: string; label: string };
type Testimonial = { quote: string; name: string; role: string };
type TeamMember = { name: string; role: string; bio: string };

/**
 * Cue-driven service cards only — no generic filler fallbacks.
 * Returns fewer than 3 when cues are sparse; caller should drop the section.
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

  return cards.slice(0, 4);
}

/**
 * Stats derived only from brief facts — never hashed guest counts or years.
 */
export function realStats(brief: Brief): StatItem[] {
  const items: StatItem[] = [];

  if (brief.menuItems.length > 0) {
    items.push({
      value: String(brief.menuItems.length),
      label: "Menu Favorites",
    });
  }

  const foundedYear = brief.foundedYear;
  if (
    foundedYear !== null &&
    foundedYear > 1800 &&
    foundedYear <= new Date().getFullYear()
  ) {
    const years = Math.max(0, new Date().getFullYear() - foundedYear);
    items.push({
      value: years > 0 ? `${years}+` : "New",
      label: years > 0 ? "Years of Craft" : "Just Opened",
    });
  }

  const dietary = brief.dietary ?? [];
  if (dietary.length > 0) {
    items.push({
      value: String(dietary.length),
      label: "Dietary Options",
    });
  }

  const cuisineBits = brief.category
    .split(/[,/&]| and /i)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
  if (cuisineBits.length >= 2) {
    items.push({
      value: String(cuisineBits.length),
      label: "Cuisine Notes",
    });
  } else if (brief.category.trim()) {
    items.push({
      value: "1",
      label: "Cuisine Focus",
    });
  }

  const signatureDishes = brief.signatureDishes ?? [];
  if (signatureDishes.length > 0) {
    items.push({
      value: String(signatureDishes.length),
      label: "Signature Dishes",
    });
  }

  return items.slice(0, 4);
}

/**
 * @deprecated Use realStats. Kept name for call-site clarity during migration.
 */
export function defaultStats(brief: Brief): StatItem[] {
  return realStats(brief);
}

/**
 * Real testimonials from the brief only — never fabricated guests.
 */
export function briefTestimonials(brief: Brief): Testimonial[] {
  return (brief.testimonials ?? []).map((item) => ({
    quote: item.quote,
    name: item.name,
    role: item.role?.trim() || "Guest",
  }));
}

/**
 * Real team members from the brief only — never fabricated chefs.
 */
export function briefTeam(brief: Brief): TeamMember[] {
  return (brief.team ?? []).map((item) => ({
    name: item.name,
    role: item.role,
    bio: item.bio ?? "",
  }));
}
