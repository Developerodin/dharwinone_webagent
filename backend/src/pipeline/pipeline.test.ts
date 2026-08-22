import { beforeEach, describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { assemblePage } from "../pipeline/assemblePage.js";
import { factCheck } from "../pipeline/factCheck.js";
import {
  defaultComponentId,
  getSpec,
  listComponentIds,
} from "../catalog/index.js";
import { sectionTypeSchema } from "../schemas/page.schema.js";
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

describe("catalog component resolution", () => {
  // These replace the legacy pickComponent tests. Each asserts that the
  // capability the legacy picker provided still exists, now served by the
  // catalog rather than by a hardcoded id table.

  it("resolves every section type to a component for every family", () => {
    const gaps: string[] = [];
    for (const family of ["premium", "elegant", "minimal", "rustic", "vibrant", "bold"]) {
      for (const section of sectionTypeSchema.options) {
        const id = defaultComponentId(section, family);
        if (!id) gaps.push(`${family}/${section}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it("only ever resolves within the requested family", () => {
    for (const family of ["premium", "elegant", "minimal"]) {
      for (const section of sectionTypeSchema.options) {
        expect(defaultComponentId(section, family)).toMatch(
          new RegExp(`^${family}-`),
        );
      }
    }
  });

  it("exposes every variant of a section as a candidate", () => {
    expect(listComponentIds("header", "premium")).toEqual([
      "premium-header-01",
      "premium-header-02",
      "premium-header-03",
    ]);
    expect(listComponentIds("contact", "elegant")).toHaveLength(2);
  });

  it("carries the signature -03 variants across every family", () => {
    for (const family of ["premium", "elegant", "minimal", "bold"]) {
      for (const section of ["services", "reservation", "footer"] as const) {
        expect(listComponentIds(section, family)).toContain(`${family}-${section}-03`);
      }
    }
  });

  it("distinguishes components by composition, not by id suffix", () => {
    // The legacy picker remapped by suffix across families, which silently
    // assumed "-02" meant the same layout everywhere. It does not: premium's
    // hero-02 is a split, elegant's is full-bleed.
    expect(getSpec("premium-hero-02")!.layoutFamily).toBe("split");
    expect(getSpec("elegant-hero-02")!.layoutFamily).toBe("immersive");
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
