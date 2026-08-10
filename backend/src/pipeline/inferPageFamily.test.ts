import { describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { inferPageFamily } from "./inferPageFamily.js";

describe("inferPageFamily", () => {
  it("returns premium for casual Italian trattoria", () => {
    const family = inferPageFamily(
      FIXTURE_BRIEF,
      "Cozy neighborhood Italian spot with handmade pasta",
    );
    expect(family).toBe("premium");
  });

  it("returns elegant for upscale elegant restaurant", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Fine dining restaurant",
        businessName: "Caverta",
      },
      "Upscale elegant tasting menu with sommelier pairings",
    );
    expect(family).toBe("elegant");
  });

  it("returns premium for pizza cafe", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Pizza cafe",
        businessName: "Slice House",
      },
      "Casual pizza spot, family friendly brunch",
    );
    expect(family).toBe("premium");
  });

  it("returns elegant when michelin keyword present", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "French restaurant",
        businessName: "Le Jardin",
      },
      "Michelin-starred haute cuisine experience",
    );
    expect(family).toBe("elegant");
  });

  it("defaults to premium on tie", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Restaurant",
        businessName: "The Kitchen",
      },
      "Great food and atmosphere",
    );
    expect(family).toBe("premium");
  });

  it("returns premium for Chinese wok restaurant", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Chinese restaurant",
        businessName: "Dragon Wok",
      },
      "Authentic Chinese cuisine in Kolkata with veg spring rolls and chicken lollipop",
    );
    expect(family).toBe("premium");
  });

  it("ignores a single weak elegant keyword when cuisine is casual", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Chinese restaurant",
        businessName: "Dragon Wok",
      },
      "Gourmet chinese wok takeout for the neighborhood",
    );
    expect(family).toBe("premium");
  });
});
