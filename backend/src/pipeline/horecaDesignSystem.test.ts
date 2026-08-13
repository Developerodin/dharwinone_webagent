import { describe, expect, it } from "vitest";
import type { Brief } from "../schemas/brief.schema.js";
import type { Page } from "../schemas/page.schema.js";
import { applyEditOps } from "./applyEditOps.js";
import { inventPalette } from "./creativeDirector.js";
import { luminance } from "./colorResolve.js";
import {
  findCuisineMatch,
  getHorecaDesignSystem,
  inventPaletteFromHoreca,
  themeOverridesForFamily,
} from "./horecaDesignSystem.js";

const brief: Brief = {
  businessName: "Monk Cafe",
  category: "Chinese restaurant",
  phone: "555",
  address: "Raja Park",
  menuItems: [],
  photos: [],
  brandColors: null,
};

describe("horecaDesignSystem", () => {
  it("loads palettes, type pairs, and cuisines from JSON", () => {
    const system = getHorecaDesignSystem();
    expect(system.palettes.length).toBe(29);
    expect(system.typePairs.length).toBeGreaterThan(10);
    expect(system.cuisines.length).toBeGreaterThan(20);
    expect(system.componentGuidance.bySection.about).toBe("lightSection");
    expect(system.componentGuidance.bySection.footer).toBe("darkSection");
  });

  it("matches Indian / Italian cuisine cues", () => {
    expect(findCuisineMatch("indian curry tandoor")?.cuisine.id).toBe("indian");
    const italian = findCuisineMatch("cozy italian pasta trattoria");
    expect(italian?.sub?.name.toLowerCase()).toContain("italian");
    expect(italian?.cuisine.id).toBe("european");
  });

  it("invents cuisine palette with readable contrast", () => {
    const palette = inventPaletteFromHoreca("chinese cafe raja park", "seed-1");
    expect(palette?.bg).toMatch(/^#/i);
    expect(palette?.ink).toMatch(/^#/i);
    if (palette?.bg && palette.ink) {
      const bgLight = luminance(palette.bg) > 0.55;
      const inkLight = luminance(palette.ink) > 0.55;
      expect(bgLight).not.toBe(inkLight);
    }
  });

  it("family theme tokens keep ink contrasting with bg", () => {
    for (const family of ["elegant", "minimal", "rustic", "vibrant", "premium", "bold"] as const) {
      const tokens = themeOverridesForFamily(family);
      expect(tokens.bg && tokens.ink).toBeTruthy();
      const bgLight = luminance(tokens.bg!) > 0.55;
      const inkLight = luminance(tokens.ink!) > 0.55;
      expect(bgLight).not.toBe(inkLight);
    }
  });

  it("creative inventPalette prefers HoReCa cuisine mapping", () => {
    const palette = inventPalette(brief, "authentic chinese dining", "monk|chinese|");
    expect(palette.accent).toMatch(/^#/i);
    expect(palette.bg).toBeTruthy();
  });
});

describe("theme switch clears stale section colors", () => {
  it("drops styleOverrides and resets themeOverrides from catalog", async () => {
    const page: Page = {
      themeOverrides: {
        accent: "#ffffff",
        accentContrast: "#000000",
        bg: "#ffffff",
        ink: "#ffffff",
      },
      sections: [
        {
          type: "about",
          componentId: "elegant-about-01",
          content: { headline: "Our Story", body: "Hi" },
          assets: [],
          styleOverrides: { background: "#111111", text: "#ffffff" },
        },
        {
          type: "hero",
          componentId: "elegant-hero-01",
          content: { headline: "Hello" },
          assets: [],
          styleOverrides: { text: "#ffffff" },
        },
      ],
    };

    const result = await applyEditOps({
      page,
      brief,
      family: "elegant",
      ops: [{ op: "set_theme", family: "minimal" }],
    });

    expect(result.page.sections.every((s) => !s.styleOverrides)).toBe(true);
    expect(result.page.themeOverrides?.bg).toBeTruthy();
    expect(result.page.themeOverrides?.ink).toBeTruthy();
    const bgLight = luminance(result.page.themeOverrides!.bg!) > 0.55;
    const inkLight = luminance(result.page.themeOverrides!.ink!) > 0.55;
    expect(bgLight).not.toBe(inkLight);
    expect(
      result.page.sections.every((s) => s.componentId.startsWith("minimal-")),
    ).toBe(true);
  });
});
