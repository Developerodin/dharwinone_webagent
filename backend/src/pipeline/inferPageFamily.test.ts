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

  it("returns minimal for japanese omakase", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Japanese restaurant",
        businessName: "Kumo",
      },
      "Quiet omakase counter with zen hospitality",
    );
    expect(family).toBe("minimal");
  });

  it("returns rustic for smokehouse bbq", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Barbecue restaurant",
        businessName: "Oak & Ember",
      },
      "Farm-to-table smokehouse BBQ with craft sides",
    );
    expect(family).toBe("rustic");
  });

  it("returns vibrant for colorful street food", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Street food",
        businessName: "Neon Taco",
      },
      "Colorful latin street food with neon vibes",
    );
    expect(family).toBe("vibrant");
  });

  it("biases tea house toward elegant without needing hash", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Tea house",
        businessName: "Jaipur Tea House",
        menuItems: [],
      },
      "Authentic chai and afternoon tea in Jaipur",
    );
    expect(family).toBe("elegant");
  });

  it("biases bare tea name toward elegant when no casual cafe cues", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Tea",
        businessName: "Jaipur Tea",
        menuItems: [],
      },
      "Quiet tea lounge with chai service",
    );
    expect(family).toBe("elegant");
  });

  it("keeps casual cafe on premium", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Cafe",
        businessName: "Harbor Brunch Cafe",
        menuItems: [],
      },
      "Casual neighborhood cafe with bakery brunch",
    );
    expect(family).toBe("premium");
  });

  it("does not force Indian without tea cues to elegant", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Indian restaurant",
        businessName: "Spice Route",
        menuItems: [],
      },
      "Family-friendly Indian takeout and tandoor",
    );
    expect(family).not.toBe("elegant");
    expect(family).toBe("premium");
  });

  it("keeps fine dining on elegant", () => {
    const family = inferPageFamily(
      {
        ...FIXTURE_BRIEF,
        category: "Fine dining",
        businessName: "Atelier Noir",
        menuItems: [],
      },
      "Upscale tasting menu with sommelier pairings",
    );
    expect(family).toBe("elegant");
  });
});
