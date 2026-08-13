import { describe, expect, it } from "vitest";
import type { Brief } from "../schemas/brief.schema.js";
import { creativeDirectionSchema } from "../schemas/creativeDirection.schema.js";
import type { Page } from "../schemas/page.schema.js";
import { applyRemixLayout } from "./applyEditOps.js";
import {
  inventPalette,
  paletteFromBrandColors,
  runCreativeDirectorSync,
} from "./creativeDirector.js";
import { parseEditOpsFixture } from "./parseEditOps.js";

const italianBrief: Brief = {
  businessName: "Nonna Rosa Trattoria",
  category: "Italian restaurant",
  phone: "(555) 234-8890",
  address: "42 Via Roma Street",
  menuItems: [{ name: "Pasta", price: 16, description: null }],
  photos: [],
  brandColors: null,
  usp: null,
  story: null,
  foundedYear: null,
  signatureDishes: [],
  audience: null,
  priceBand: null,
  vibe: [],
  hours: [],
  neighbourhood: null,
  awards: [],
  testimonials: [],
  team: [],
  dietary: [],
  socials: null,
};

/**
 * Minimal page for remix tests.
 */
function samplePage(): Page {
  return {
    themeOverrides: {
      accent: "#c23b22",
      accentContrast: "#ffffff",
      bg: "#faf6f1",
    },
    sections: [
      {
        type: "header",
        componentId: "premium-header-01",
        content: { brandName: "Nonna" },
        assets: [],
      },
      {
        type: "hero",
        componentId: "premium-hero-01",
        content: { headline: "Hello", subheading: "", ctaLabel: "Menu" },
        assets: [{ key: "primary", imagePath: "/images/x.jpg" }],
      },
      {
        type: "about",
        componentId: "premium-about-01",
        content: { headline: "About", body: "Story" },
        assets: [],
      },
      {
        type: "footer",
        componentId: "premium-footer-01",
        content: { brandName: "Nonna" },
        assets: [],
      },
    ],
  };
}

describe("runCreativeDirector", () => {
  it("is stable for the same brief", () => {
    const a = runCreativeDirectorSync({
      brief: italianBrief,
      chatText: "Italian trattoria in Brooklyn",
    });
    const b = runCreativeDirectorSync({
      brief: italianBrief,
      chatText: "Italian trattoria in Brooklyn",
    });
    expect(a.seed).toBe(b.seed);
    expect(a.family).toBe(b.family);
    expect(a.sectionVariantHints).toEqual(b.sectionVariantHints);
    expect(a.palette).toEqual(b.palette);
  });

  it("uses client brand colors when provided", () => {
    const brief: Brief = {
      ...italianBrief,
      brandColors: ["#22c55e", "cream"],
    };
    const direction = runCreativeDirectorSync({
      brief,
      chatText: "green brand cafe",
    });
    expect(direction.paletteSource).toBe("client_brand");
    expect(direction.palette?.accent).toBe("#22c55e");
    expect(paletteFromBrandColors(["#22c55e"])?.accent).toBe("#22c55e");
  });

  it("invents a palette when brand colors are missing", () => {
    const direction = runCreativeDirectorSync({
      brief: italianBrief,
      chatText: "cozy italian pasta place",
    });
    expect(direction.paletteSource).toBe("creative_pick");
    expect(direction.palette?.accent).toMatch(/^#[0-9a-f]{6}$/i);
    const invented = inventPalette(italianBrief, "italian pasta", direction.seed);
    expect(invented.accent).toBeTruthy();
  });

  it("keeps all variant hints inside the chosen family", () => {
    const direction = runCreativeDirectorSync({
      brief: italianBrief,
      chatText: "fine dining italian",
      family: "elegant",
    });
    expect(direction.family).toBe("elegant");
    for (const [section, id] of Object.entries(direction.sectionVariantHints)) {
      expect(id.startsWith("elegant-")).toBe(true);
      expect(id).toContain(section === "location_map" ? "location" : section);
    }
  });

  it("diverges for different businesses", () => {
    const a = runCreativeDirectorSync({
      brief: italianBrief,
      chatText: "italian",
    });
    const b = runCreativeDirectorSync({
      brief: {
        ...italianBrief,
        businessName: "Tokyo Omakan",
        category: "Sushi restaurant",
      },
      chatText: "omakase sushi",
    });
    expect(a.seed).not.toBe(b.seed);
  });
});

describe("creativeDirectionSchema Wave 3 extensions", () => {
  it("accepts archetype and narrative optional fields", () => {
    const result = creativeDirectionSchema.safeParse({
      family: "premium",
      seed: "test",
      palette: null,
      paletteSource: "creative_pick",
      sectionVariantHints: {},
      rationale: "test direction",
      archetype: "menu_forward",
      narrative: {
        positioning: "Best pasta in Brooklyn",
        proofPoints: ["House-made pasta", "Wood-fired oven"],
        voiceRules: ["Mention the neighbourhood"],
        avoidPhrases: ["culinary journey"],
      },
      paletteId: "italian-warm",
      typePairId: "editorial-serif",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archetype).toBe("menu_forward");
      expect(result.data.narrative?.positioning).toBe("Best pasta in Brooklyn");
    }
  });

  it("remains backward-compatible without optional fields", () => {
    const result = creativeDirectionSchema.safeParse({
      family: "elegant",
      seed: "abc",
      palette: { accent: "#c9a962", accentContrast: "#000000" },
      paletteSource: "client_brand",
      sectionVariantHints: { hero: "elegant-hero-01" },
      rationale: "minimal direction",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archetype).toBeUndefined();
      expect(result.data.sectionPlan).toBeUndefined();
    }
  });

  it("runCreativeDirectorSync includes archetype and sectionPlan", () => {
    const direction = runCreativeDirectorSync({
      brief: italianBrief,
      chatText: "Italian trattoria in Brooklyn",
    });
    expect(direction.archetype).toBeDefined();
    expect(direction.sectionPlan).toBeDefined();
    expect(Array.isArray(direction.sectionPlan)).toBe(true);
    expect(direction.sectionPlan!.length).toBeGreaterThan(0);
    expect(direction.narrative).toBeDefined();
  });
});

describe("remix_layout", () => {
  it("parses surprise/remix intents", () => {
    expect(parseEditOpsFixture("surprise me").ops[0]?.op).toBe("remix_layout");
    expect(parseEditOpsFixture("remix layout").ops[0]?.op).toBe("remix_layout");
  });

  it("changes component ids but preserves themeOverrides", () => {
    const page = samplePage();
    const before = structuredClone(page.themeOverrides);
    const note = applyRemixLayout(page, "premium", italianBrief, "remix-salt-1");
    expect(note.toLowerCase()).toContain("remix");
    expect(page.themeOverrides).toEqual(before);
    const ids = page.sections.map((s) => s.componentId);
    expect(ids.every((id) => id.startsWith("premium-"))).toBe(true);
    // With salt, at least hero/about/header should be able to move off -01
    const changed = page.sections.some(
      (s, i) => s.componentId !== samplePage().sections[i]!.componentId,
    );
    expect(changed).toBe(true);
  });
});
