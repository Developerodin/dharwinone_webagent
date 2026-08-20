import { beforeEach, describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { assemblePage } from "../pipeline/assemblePage.js";
import { factCheck } from "../pipeline/factCheck.js";
import { pickComponent } from "../pipeline/pickComponent.js";
import { pickGalleryImages, pickImage } from "../pipeline/pickImage.js";
import { loadCatalog, resetCatalogCache } from "../lib/catalog.js";
import { planSections } from "../pipeline/planSections.js";
import { runPipeline } from "../pipeline/runPipeline.js";
import { writeAllSectionCopy } from "../pipeline/writeAllCopy.js";
import { writeCopyFixture } from "../pipeline/writeCopy.js";
import { verifyBriefAgainstSource } from "../pipeline/verifyBrief.js";

describe("planSections", () => {
  it("returns a core spine without fabricated social-proof blocks", () => {
    const sections = planSections({ brief: FIXTURE_BRIEF });
    // Testimonials/team require real brief arrays — never fabricated.
    expect(sections).not.toContain("testimonials");
    expect(sections).not.toContain("team");
    expect(sections[0]).toBe("header");
    expect(sections).toContain("hero");
    expect(sections).toContain("menu");
    expect(sections[sections.length - 1]).toBe("footer");
  });

  it("omits team/testimonials when only keyword cues exist without brief data", () => {
    const sections = planSections({
      brief: FIXTURE_BRIEF,
      chatText: "Meet our chef and kitchen staff",
    });
    expect(sections).not.toContain("team");
    expect(sections).not.toContain("testimonials");
    expect(sections).not.toContain("services");
  });

  it("includes services when catering or private dining is mentioned", () => {
    const sections = planSections({
      brief: FIXTURE_BRIEF,
      chatText: "We offer catering and private dining events",
    });
    expect(sections).toContain("services");
  });
});

describe("pickComponent", () => {
  it("maps each section type to a premium variant by default", () => {
    expect(pickComponent("hero")).toMatch(/^premium-hero-0[123]$/);
    expect(pickComponent("menu")).toMatch(/^premium-menu-0[123]$/);
    expect(pickComponent("testimonials")).toMatch(
      /^premium-testimonials-0[123]$/,
    );
  });

  it("maps section types to elegant variants when family is set", () => {
    expect(pickComponent("hero", "elegant")).toMatch(/^elegant-hero-0[123]$/);
    expect(pickComponent("gallery", "elegant")).toMatch(
      /^elegant-gallery-0[123]$/,
    );
    expect(pickComponent("reservation", "elegant")).toMatch(
      /^elegant-reservation-0[123]$/,
    );
  });

  it("preserves variant suffix when remapping across families", () => {
    expect(
      pickComponent("hero", "elegant", {
        preferComponentId: "premium-hero-02",
      }),
    ).toBe("elegant-hero-02");
    expect(
      pickComponent("menu", "premium", {
        preferComponentId: "elegant-menu-01",
      }),
    ).toBe("premium-menu-01");
  });

  it("diversifies variants by business identity", () => {
    const names = [
      "Alpha Kitchen",
      "Zeta Dining",
      "Harbor House",
      "Maple Room",
      "Copper Spoon",
      "Nightingale",
      "Orchard Table",
      "Lumen Hall",
    ];
    const picked = names.map((businessName) =>
      pickComponent("header", "premium", {
        brief: {
          ...FIXTURE_BRIEF,
          businessName,
          category: "Restaurant",
          address: "100 Main Ave, Portland, OR",
        },
      }),
    );
    expect(picked.every((id) => /^premium-header-0[123]$/.test(id))).toBe(true);
    expect(new Set(picked).size).toBeGreaterThan(1);
  });

  it("exposes three header variants in the pool", () => {
    expect(pickComponent("header", "premium", {
      preferComponentId: "premium-header-01",
    })).toBe("premium-header-01");
    expect(pickComponent("header", "elegant", {
      preferComponentId: "premium-header-02",
    })).toBe("elegant-header-02");
    expect(pickComponent("header", "minimal", {
      preferComponentId: "premium-header-03",
    })).toBe("minimal-header-03");
  });

  it("exposes services/reservation/footer-03 across families", () => {
    expect(
      pickComponent("services", "minimal", {
        preferComponentId: "premium-services-03",
      }),
    ).toBe("minimal-services-03");
    expect(
      pickComponent("reservation", "elegant", {
        preferComponentId: "premium-reservation-03",
      }),
    ).toBe("elegant-reservation-03");
    expect(
      pickComponent("footer", "bold", {
        preferComponentId: "premium-footer-03",
      }),
    ).toBe("bold-footer-03");
    expect(
      pickComponent("stats", "rustic", {
        preferComponentId: "premium-stats-03",
      }),
    ).toBe("rustic-stats-03");
  });

  it("exposes about/menu/gallery/hero-03 across families", () => {
    expect(
      pickComponent("about", "minimal", {
        preferComponentId: "premium-about-03",
      }),
    ).toBe("minimal-about-03");
    expect(
      pickComponent("menu", "elegant", {
        preferComponentId: "premium-menu-03",
      }),
    ).toBe("elegant-menu-03");
    expect(
      pickComponent("gallery", "bold", {
        preferComponentId: "premium-gallery-03",
      }),
    ).toBe("bold-gallery-03");
    expect(
      pickComponent("hero", "rustic", {
        preferComponentId: "premium-hero-03",
      }),
    ).toBe("rustic-hero-03");
  });

  it("prefers story-forward about-02", () => {
    const id = pickComponent("about", "premium", {
      brief: FIXTURE_BRIEF,
      chatText: "Our family heritage and chef tradition since 1982",
    });
    expect(id).toBe("premium-about-02");
  });

  it("prefers fine-dining header-01 and street/quick header-03", () => {
    const fine = pickComponent("header", "elegant", {
      brief: {
        ...FIXTURE_BRIEF,
        businessName: "Atelier Noir",
        category: "Fine dining",
        address: "12 Oak Ave, Chicago, IL",
      },
      chatText: "elegant tasting menu and refined service",
    });
    const casual = pickComponent("header", "vibrant", {
      brief: {
        ...FIXTURE_BRIEF,
        businessName: "Taco Contra",
        category: "Taco cafe",
        address: "88 Market Ave, Austin, TX",
      },
      chatText: "casual modern counter service brunch",
    });
    expect(fine).toBe("elegant-header-01");
    expect(casual).toBe("vibrant-header-03");
  });

  it("soft-boosts tea/lounge headers toward 01/02, not always 03", () => {
    const seeds = [
      "Jaipur Tea",
      "Jaipur Tea House",
      "Lotus Tea Lounge",
      "Chai Court",
      "Afternoon Tea Hall",
      "Silk Tea Room",
    ];
    const headers = seeds.map((businessName) =>
      pickComponent("header", "elegant", {
        brief: {
          ...FIXTURE_BRIEF,
          businessName,
          category: "Tea house",
          address: "1 Palace Rd, Jaipur",
        },
        chatText: "tea lounge with chai and afternoon tea",
      }),
    );
    expect(headers.every((id) => /^elegant-header-0[12]$/.test(id))).toBe(true);
    expect(new Set(headers).size).toBeGreaterThan(1);
  });

  it("varies tea hero suffixes across name seeds (not stuck on hero-03)", () => {
    const seeds = [
      "Jaipur Tea",
      "Jaipur Tea House",
      "Lotus Tea",
      "Chai Court",
      "Silk Tea Room",
      "Amber Leaf Tea",
    ];
    const heroes = seeds.map((businessName) =>
      pickComponent("hero", "elegant", {
        brief: {
          ...FIXTURE_BRIEF,
          businessName,
          category: "Tea house",
          address: "1 Palace Rd, Jaipur",
        },
        chatText: "photo gallery visual tea lounge",
      }),
    );
    expect(heroes.every((id) => /^elegant-hero-0[123]$/.test(id))).toBe(true);
    expect(heroes.every((id) => id === "elegant-hero-03")).toBe(false);
    expect(new Set(heroes).size).toBeGreaterThan(1);
  });
});

describe("pickImage", () => {
  beforeEach(() => {
    resetCatalogCache();
  });

  it("returns a catalog path for hero", () => {
    const path = pickImage({ sectionType: "hero" });
    expect(path).toMatch(/^\/images\/restaurant\/hero\//);
  });

  it("returns elegant local catalog images when family is elegant", () => {
    const path = pickImage({ sectionType: "hero", family: "elegant" });
    expect(path).toMatch(/^\/images\/restaurant\/hero\//);
    expect(path).toMatch(/\.webp$/);
  });

  it("returns portrait about images (not blank) for premium and elegant", () => {
    const premiumAbout = pickImage({
      sectionType: "about",
      orientation: "portrait",
      family: "premium",
    });
    const elegantAbout = pickImage({
      sectionType: "about",
      orientation: "portrait",
      family: "elegant",
    });
    expect(premiumAbout).toMatch(/^\/images\/restaurant\/about\/.+\.webp$/);
    expect(elegantAbout).toMatch(/^\/images\/restaurant\/about\/.+\.webp$/);
  });

  it("returns elegant gallery images from local catalog", () => {
    const paths = pickGalleryImages(4, "elegant");
    expect(paths.length).toBe(4);
    expect(
      paths.every(
        (path) =>
          path.startsWith("/images/restaurant/gallery/") && path.endsWith(".webp"),
      ),
    ).toBe(true);
  });

  it("returns venue images for location_map (reuses about catalog)", () => {
    const path = pickImage({
      sectionType: "location_map",
      orientation: "landscape",
      family: "minimal",
      category: "Indian",
    });
    expect(path).toMatch(/^\/images\/restaurant\/about\/.+\.webp$/);
  });

  it("prefers cuisine-tagged images when category is provided", () => {
    const path = pickImage({
      sectionType: "menu",
      orientation: "square",
      family: "premium",
      category: "Indian",
    });
    expect(path).toMatch(/^\/images\/restaurant\/menu\/.+\.webp$/);

    const entry = loadCatalog().find(
      (item) => item.path === path && item.family === "premium",
    );
    expect(entry?.tags.some((tag) => tag.includes("indian"))).toBe(true);
  });
});

describe("factCheck", () => {
  it("passes copy with no invented facts", () => {
    const copy = writeCopyFixture({
      componentId: "premium-hero-01",
      brief: FIXTURE_BRIEF,
    });
    expect(factCheck({ copy, brief: FIXTURE_BRIEF }).ok).toBe(true);
  });

  it("flags invented phone numbers", () => {
    const result = factCheck({
      copy: { headline: "Call us at (999) 999-9999 today" },
      brief: FIXTURE_BRIEF,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.flaggedSpans.length).toBeGreaterThan(0);
    }
  });

  it("allows brief phone when formatting differs in copy", () => {
    const result = factCheck({
      copy: { headline: "Reach us at 555-234-8890 for reservations" },
      brief: FIXTURE_BRIEF,
    });
    expect(result.ok).toBe(true);
  });

  it("allows brief menu price formatted as decimal without dollar sign", () => {
    const result = factCheck({
      copy: { introText: "Try our pizza starting at 16.00" },
      brief: FIXTURE_BRIEF,
    });
    expect(result.ok).toBe(true);
  });

  it("does not flag bare HH:MM times when brief has no hours", () => {
    const result = factCheck({
      copy: { body: "Join us from 11:00 until late" },
      brief: FIXTURE_BRIEF,
    });
    expect(result.ok).toBe(true);
  });
});

describe("verifyBriefAgainstSource", () => {
  it("strips menu items not present in source text", () => {
    const chatText =
      "Nonna Rosa — Italian spot. Margherita Pizza $16. Phone (555) 234-8890.";
    const brief = verifyBriefAgainstSource(
      {
        businessName: "Nonna Rosa",
        category: "Italian",
        phone: "(555) 234-8890",
        address: "999 Fake Street",
        menuItems: [
          { name: "Margherita Pizza", price: 16, description: null },
          { name: "Invented Dish", price: 99, description: null },
        ],
        photos: [],
      brandColors: null,
      },
      chatText,
    );
    expect(brief.menuItems).toHaveLength(1);
    expect(brief.menuItems[0]?.name).toBe("Margherita Pizza");
    expect(brief.address).toBeNull();
  });

  it("keeps menu items when source uses ₹ and comma prices", () => {
    const chatText = "Biryani House. Chicken Biryani ₹1,295.";
    const brief = verifyBriefAgainstSource(
      {
        businessName: "Biryani House",
        category: "Indian",
        phone: null,
        address: null,
        menuItems: [
          { name: "Chicken Biryani", price: 1295, description: null },
        ],
        photos: [],
      brandColors: null,
      },
      chatText,
    );
    expect(brief.menuItems).toHaveLength(1);
  });
});

describe("writeCopyFixture header", () => {
  it("produces brief-derived header fields instead of Fine Dining filler", () => {
    const copy = writeCopyFixture({
      componentId: "premium-header-01",
      brief: FIXTURE_BRIEF,
    });
    expect(copy.brandName).toBe(FIXTURE_BRIEF.businessName);
    expect(String(copy.tagline)).not.toMatch(/fine dining/i);
    expect(String(copy.tagline).length).toBeGreaterThanOrEqual(6);
    expect(copy.ctaLabel).toBe("Reserve a Table");
    expect(copy.eyebrow).toBe(FIXTURE_BRIEF.category);
  });

  it("varies fixture tone by family when USP is absent", () => {
    const thinBrief = {
      ...FIXTURE_BRIEF,
      usp: null,
      signatureDishes: [] as string[],
    };
    const elegant = writeCopyFixture({
      componentId: "elegant-hero-01",
      brief: thinBrief,
      family: "elegant",
    });
    const rustic = writeCopyFixture({
      componentId: "rustic-hero-01",
      brief: thinBrief,
      family: "rustic",
    });
    expect(String(elegant.subheading)).toMatch(/elegant/i);
    expect(String(rustic.subheading)).toMatch(/heartfelt|care/i);
    expect(elegant.subheading).not.toBe(rustic.subheading);
  });

  it("prefers USP in hero fixture when present", () => {
    const copy = writeCopyFixture({
      componentId: "premium-hero-01",
      brief: FIXTURE_BRIEF,
      family: "premium",
    });
    expect(String(copy.subheading)).toContain("Wood-fired");
  });
});

describe("assemblePage", () => {
  it("validates assembled page JSON", () => {
    const page = assemblePage([
      {
        type: "hero",
        componentId: "premium-hero-01",
        content: { headline: "Test", subheading: "Sub", ctaLabel: "Go" },
        assets: [{ key: "primary", imagePath: "/images/restaurant/hero/hero-01.webp" }],
      },
    ]);
    expect(page.sections).toHaveLength(1);
  });
});

describe("runPipeline fixture mode", () => {
  it("produces a valid page without LLM", async () => {
    const result = await runPipeline({
      chatText: "ignored in fixture mode",
      useFixture: true,
    });
    expect(result.page.sections.length).toBeGreaterThan(0);
    expect(result.brief.businessName).toBe(FIXTURE_BRIEF.businessName);
    expect(result.stages.length).toBe(9);
  });

  it("assigns a primary image to location_map for minimal family", async () => {
    const result = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "minimal",
    });
    const location = result.page.sections.find(
      (section) => section.type === "location_map",
    );
    expect(location).toBeTruthy();
    expect(location?.assets[0]?.imagePath).toMatch(
      /^\/images\/restaurant\/about\/.+\.webp$/,
    );
  });

  it("uses elegant components when family is elegant", async () => {
    const result = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "elegant",
    });
    expect(result.family).toBe("elegant");
    expect(result.page.sections[0]?.componentId).toMatch(
      /^elegant-header-0[123]$/,
    );
    expect(
      result.page.sections.some((section) =>
        section.componentId.startsWith("elegant-hero-"),
      ),
    ).toBe(true);
    expect(
      result.page.sections.some((section) =>
        section.assets.some(
          (asset) =>
            asset.imagePath.startsWith("/images/restaurant/") &&
            asset.imagePath.endsWith(".webp"),
        ),
      ),
    ).toBe(true);
  });

  it("skips extraction when a confirmed brief is provided", async () => {
    const result = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      brief: FIXTURE_BRIEF,
    });
    const extractor = result.stages.find(
      (stage) => stage.name === "Brief Extractor",
    );
    expect(extractor?.status).toBe("done");
    expect(extractor?.ms).toBe(0);
  });

  it("infers elegant family from upscale brief when family not set", async () => {
    const result = await runPipeline({
      chatText: "Michelin-starred upscale elegant tasting menu",
      useFixture: true,
      brief: {
        ...FIXTURE_BRIEF,
        category: "Fine dining restaurant",
        businessName: "Caverta",
      },
    });
    expect(result.family).toBe("elegant");
    expect(
      result.page.sections.some((section) =>
        section.componentId.startsWith("elegant-"),
      ),
    ).toBe(true);
  });

  it("builds rustic family components when requested", async () => {
    const result = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "rustic",
    });
    expect(result.family).toBe("rustic");
    expect(result.page.sections[0]?.componentId).toMatch(
      /^rustic-header-0[123]$/,
    );
    expect(
      result.page.sections.some((s) => s.type === "contact"),
    ).toBe(true);
    expect(
      result.page.sections.some((s) => s.type === "footer"),
    ).toBe(true);
  });
});

describe("writeAllSectionCopy fixture path", () => {
  it("returns copy for every planned section without LLM", async () => {
    const sections = [
      { sectionType: "hero" as const, componentId: "premium-hero-01" },
      { sectionType: "about" as const, componentId: "premium-about-01" },
      { sectionType: "menu" as const, componentId: "premium-menu-01" },
      { sectionType: "footer" as const, componentId: "premium-footer-01" },
    ];
    const direction = {
      family: "premium" as const,
      seed: "fixture-seed",
      palette: null,
      paletteSource: "creative_pick" as const,
      sectionVariantHints: {},
      rationale: "fixture",
    };
    const copy = await writeAllSectionCopy({
      brief: FIXTURE_BRIEF,
      direction,
      sections,
      useFixture: true,
    });
    expect(copy["hero"]).toBeDefined();
    expect(copy["about"]).toBeDefined();
    expect(copy["menu"]).toBeDefined();
    expect(copy["footer"]).toBeDefined();
    // Each section must have at least one string field
    expect(typeof copy["hero"]?.headline).toBe("string");
    expect(typeof copy["about"]?.headline).toBe("string");
  });

  it("fills all sections with non-empty strings in fixture mode", async () => {
    const allTypes = planSections({ brief: FIXTURE_BRIEF });
    // Pick any valid componentId for each type (premium-01 variants)
    const sections = allTypes.map((sectionType) => ({
      sectionType,
      componentId: sectionType === "location_map"
        ? "premium-location-01"
        : `premium-${sectionType}-01`,
    }));
    const direction = {
      family: "premium" as const,
      seed: "all-sections",
      palette: null,
      paletteSource: "creative_pick" as const,
      sectionVariantHints: {},
      rationale: "fixture",
    };
    const copy = await writeAllSectionCopy({
      brief: FIXTURE_BRIEF,
      direction,
      sections,
      useFixture: true,
    });
    for (const { sectionType } of sections) {
      expect(copy[sectionType], `missing copy for ${sectionType}`).toBeDefined();
    }
  });
});
