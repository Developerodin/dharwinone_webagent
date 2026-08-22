import type { Archetype } from "../schemas/creativeDirection.schema.js";
import type { SignalRule } from "./signalScoring.js";

/**
 * Archetype signals for the hospitality vertical.
 *
 * This file is *data*. A future vertical ships its own rule table and outcome
 * list; `classifyBySignals` itself knows nothing about restaurants.
 *
 * Weighting principle:
 *   8-10  structured brief facts (priceBand, explicit service model)
 *   5-7   unambiguous phrases ("tasting menu", "food truck")
 *   2-3   weak or shared words ("counter", "bar", "lunch") that appear in
 *         plenty of businesses that are not that archetype
 *
 * Outcome order is the tie-break order.
 */
export const ARCHETYPE_OUTCOMES: readonly Archetype[] = [
  "reservation_first",
  "menu_forward",
  "story_led",
  "visual_immersive",
  "quick_service",
  "neighbourhood",
];

export const ARCHETYPE_RULES: ReadonlyArray<SignalRule<Archetype>> = [
  // ---------------------------------------------------------- fine dining
  {
    outcome: "reservation_first",
    weight: 9,
    test: (brief) => brief.priceBand === "fine_dining",
    note: "priceBand=fine_dining",
    // A fine-dining brief is not a quick-service business, whatever words it
    // happens to use. This is the fix for "twelve-seat counter" omakase.
    suppresses: { quick_service: 12 },
  },
  {
    outcome: "reservation_first",
    weight: 7,
    pattern: /\b(tasting\s*menu|omakase|kaiseki|prix\s*fixe|chef'?s\s*table|degustation)\b/,
    note: "fixed-menu service model",
    suppresses: { quick_service: 10 },
  },
  {
    outcome: "reservation_first",
    weight: 6,
    pattern: /\b(fine\s*dining|michelin|haute\s*cuisine|white\s*tablecloth)\b/,
    note: "fine dining language",
    suppresses: { quick_service: 8 },
  },
  {
    outcome: "reservation_first",
    weight: 5,
    pattern: /\b(reservation\s*only|booking\s*essential|by\s*reservation|book\s*ahead)\b/,
    note: "reservation required",
    suppresses: { quick_service: 6 },
  },
  {
    outcome: "reservation_first",
    weight: 3,
    test: (brief) => brief.priceBand === "premium",
    note: "priceBand=premium",
  },

  // -------------------------------------------------------- quick service
  {
    outcome: "quick_service",
    weight: 7,
    pattern: /\b(quick\s*service|fast\s*food|qsr|food\s*truck|drive[\s-]?thru|self[\s-]?order)\b/,
    note: "explicit quick-service model",
  },
  {
    outcome: "quick_service",
    weight: 5,
    pattern: /\b(grab[\s-]?and[\s-]?go|order\s*at\s*the\s*(counter|till)|no\s*table\s*service)\b/,
    note: "counter-service model",
  },
  {
    outcome: "quick_service",
    weight: 4,
    test: (brief) => brief.priceBand === "budget",
    note: "priceBand=budget",
  },
  // Weak words. Plenty of fine-dining rooms have a counter, a bar, takeaway
  // and a lunch service — on their own these must never decide the archetype.
  {
    outcome: "quick_service",
    weight: 2,
    pattern: /\b(takeaway|takeout|take[\s-]?away|pickup|collection)\b/,
    note: "offers takeaway (weak)",
  },
  { outcome: "quick_service", weight: 1, pattern: /\bcounter\b/, note: "mentions counter (weak)" },

  // ------------------------------------------------------------ story led
  {
    outcome: "story_led",
    weight: 6,
    test: (brief) => Boolean(brief.story?.trim()),
    note: "brief has a story",
  },
  {
    outcome: "story_led",
    weight: 4,
    pattern: /\b(heritage|generations?|family[\s-]?run|since\s*\d{4}|founded\s*in|legacy|recipes?\s*passed)\b/,
    note: "heritage language",
  },
  {
    outcome: "story_led",
    weight: 2,
    test: (brief) =>
      typeof brief.foundedYear === "number" &&
      brief.foundedYear > 1800 &&
      new Date().getFullYear() - brief.foundedYear >= 25,
    note: "long-established",
  },

  // ----------------------------------------------------- visual immersive
  {
    outcome: "visual_immersive",
    weight: 6,
    pattern: /\b(rooftop|speakeasy|immersive|listening\s*bar|supper\s*club)\b/,
    note: "experience-led venue",
  },
  {
    outcome: "visual_immersive",
    weight: 4,
    pattern: /\b(cocktail\s*bar|wine\s*bar|interior\s*design|photogenic|instagram)\b/,
    note: "visually-led venue",
  },
  {
    outcome: "visual_immersive",
    weight: 3,
    test: (brief) => brief.photos.length >= 6,
    note: "photo-rich brief",
  },

  // --------------------------------------------------------- menu forward
  {
    outcome: "menu_forward",
    weight: 5,
    pattern: /\b(signature\s*dish|house\s*special|dish[\s-]?led|seasonal\s*menu)\b/,
    note: "menu-led language",
  },
  {
    outcome: "menu_forward",
    weight: 3,
    pattern: /\b(known\s*for|famous\s*for|renowned\s*for|best\s*known)\b/,
    note: "known for a dish",
  },
  // Graduated: naming one dish is already a menu-forward signal; naming
  // several is a stronger one. Both rules can fire and stack.
  {
    outcome: "menu_forward",
    weight: 3,
    test: (brief) => (brief.signatureDishes?.length ?? 0) >= 1,
    note: "names a signature dish",
  },
  {
    outcome: "menu_forward",
    weight: 2,
    test: (brief) => (brief.signatureDishes?.length ?? 0) >= 3,
    note: "names several signature dishes",
  },
  {
    outcome: "menu_forward",
    weight: 2,
    test: (brief) => brief.menuItems.length >= 3,
    note: "menu supplied",
  },
  {
    outcome: "menu_forward",
    weight: 1,
    test: (brief) => brief.menuItems.length >= 6,
    note: "extensive menu",
  },

  // --------------------------------------------------------- neighbourhood
  {
    outcome: "neighbourhood",
    weight: 4,
    pattern: /\b(neighbourhood|neighborhood|local\s*(spot|favourite|favorite)|regulars|everyday|community)\b/,
    note: "neighbourhood language",
  },
  {
    outcome: "neighbourhood",
    weight: 2,
    test: (brief) => Boolean(brief.neighbourhood?.trim()),
    note: "named neighbourhood",
  },
];
