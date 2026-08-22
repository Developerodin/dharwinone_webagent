import { describe, expect, it } from "vitest";
import { classifyArchetype, inferArchetype } from "./creativeDirectionLlm.js";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";

/**
 * Builds a brief with only the fields a case cares about.
 */
function brief(overrides: Partial<Brief>): Brief {
  return {
    ...FIXTURE_BRIEF,
    usp: null,
    story: null,
    foundedYear: null,
    signatureDishes: [],
    neighbourhood: null,
    priceBand: null,
    menuItems: [],
    vibe: [],
    ...overrides,
  } as Brief;
}

describe("archetype classification", () => {
  it("does not let one weak keyword outrank the whole brief", () => {
    // The Phase 0 regression: a twelve-seat omakase counter read as quick
    // service because its USP contained the word "counter".
    const kaiseki = brief({
      category: "Japanese kaiseki fine dining",
      priceBand: "fine_dining",
      usp: "A twelve-seat counter serving one omakase, changed with the season",
      audience: "guests who book a single seating months ahead",
    });
    expect(inferArchetype(kaiseki, "")).toBe("reservation_first");

    const result = classifyArchetype(kaiseki, "");
    expect(result.scores.quick_service).toBeLessThan(
      result.scores.reservation_first,
    );
  });

  it.each([
    ["counter", "We serve at a marble counter"],
    ["takeaway", "We also do takeaway for regulars"],
    ["bar", "There is a small bar for walk-ins"],
    ["lunch", "A short lunch service on weekdays"],
    ["pickup", "Pickup is available at the door"],
  ])(
    "keeps a fine-dining brief off quick_service despite mentioning %s",
    (_word, sentence) => {
      const fine = brief({
        category: "Fine dining tasting menu restaurant",
        priceBand: "fine_dining",
        usp: sentence,
      });
      expect(inferArchetype(fine, sentence)).not.toBe("quick_service");
    },
  );

  it("still classifies a genuine quick-service business", () => {
    const qsr = brief({
      category: "Fast food burger counter",
      priceBand: "budget",
      usp: "Order at the counter, no table service, grab-and-go",
    });
    expect(inferArchetype(qsr, "quick service")).toBe("quick_service");
  });

  it("classifies a food truck as quick service", () => {
    const truck = brief({
      category: "Taco food truck",
      priceBand: "budget",
      usp: "A food truck parked outside the brewery",
    });
    expect(inferArchetype(truck, "")).toBe("quick_service");
  });

  it("classifies a heritage brief as story led", () => {
    const heritage = brief({
      category: "Italian trattoria",
      story: "Opened by the family in 1958 and run by three generations since.",
      foundedYear: 1958,
    });
    expect(inferArchetype(heritage, "")).toBe("story_led");
  });

  it("classifies a rooftop cocktail venue as visual immersive", () => {
    const rooftop = brief({
      category: "Rooftop cocktail bar",
      usp: "A rooftop room with a listening bar and skyline views",
    });
    expect(inferArchetype(rooftop, "")).toBe("visual_immersive");
  });

  it("classifies a dish-led restaurant as menu forward", () => {
    const dishLed = brief({
      category: "Pasta restaurant",
      signatureDishes: ["Cacio e Pepe", "Carbonara"],
      menuItems: FIXTURE_BRIEF.menuItems,
      usp: "Known for cacio e pepe",
    });
    expect(inferArchetype(dishLed, "")).toBe("menu_forward");
  });

  it("falls back to neighbourhood when the brief says almost nothing", () => {
    expect(inferArchetype(brief({ category: "Restaurant" }), "")).toBe(
      "neighbourhood",
    );
  });

  it("explains its decision", () => {
    const result = classifyArchetype(
      brief({ category: "Fine dining", priceBand: "fine_dining" }),
      "",
    );
    expect(result.matched.length).toBeGreaterThan(0);
    expect(result.matched[0]!.note).toBeTruthy();
  });
});
