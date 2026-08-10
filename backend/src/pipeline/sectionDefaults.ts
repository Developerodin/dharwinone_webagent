import type { Brief } from "../schemas/brief.schema.js";

/**
 * Default service cards when the brief has no service list.
 */
export function defaultServices(brief: Brief) {
  return [
    {
      title: "Fresh Seasonal Food",
      description: `Carefully sourced ingredients prepared daily at ${brief.businessName}.`,
    },
    {
      title: "Crafted With Care",
      description: `Signature ${brief.category} dishes shaped by tradition and modern technique.`,
    },
    {
      title: "Warm Hospitality",
      description: "Thoughtful service that makes every visit feel personal and easy.",
    },
    {
      title: "Memorable Atmosphere",
      description: "A dining room designed for conversation, celebration, and comfort.",
    },
  ];
}

/**
 * Default stat counters for social-proof strips.
 */
export function defaultStats(brief: Brief) {
  const dishCount = Math.max(brief.menuItems.length, 12);
  return [
    { value: "2.5k+", label: "Happy Guests" },
    { value: String(dishCount), label: "Favourite Dishes" },
    { value: "15+", label: "Years of Craft" },
    { value: "4.9", label: "Guest Rating" },
  ];
}

/**
 * Default guest testimonials for comment/slider sections.
 */
export function defaultTestimonials(brief: Brief) {
  return [
    {
      quote: `${brief.businessName} delivered an unforgettable meal — beautiful plating, generous flavor, and flawless service.`,
      name: "Emily Carter",
      role: "Food Enthusiast",
    },
    {
      quote:
        "From the first course to the last, every detail felt intentional. We already booked our next visit.",
      name: "Daniel Brooks",
      role: "Private Dining Guest",
    },
    {
      quote:
        "Elegant atmosphere, warm hospitality, and dishes that taste as good as they look. Highly recommend.",
      name: "Sophia Bennett",
      role: "Event Guest",
    },
  ];
}

/**
 * Default chef/team members for team sections.
 */
export function defaultTeam(brief: Brief) {
  return [
    {
      name: "Chef Maya Chen",
      role: "Executive Chef",
      bio: `Leads the kitchen at ${brief.businessName} with a focus on seasonal ${brief.category}.`,
    },
    {
      name: "Luis Ortega",
      role: "Sous Chef",
      bio: "Brings precision technique and creative plating to every service.",
    },
    {
      name: "Aria Patel",
      role: "Pastry Lead",
      bio: "Crafts refined desserts that finish each meal on a high note.",
    },
  ];
}
