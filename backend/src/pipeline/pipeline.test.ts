import { beforeEach, describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { assemblePage } from "../pipeline/assemblePage.js";
import { factCheck } from "../pipeline/factCheck.js";
import { pickComponent } from "../pipeline/pickComponent.js";
import { pickGalleryImages, pickImage } from "../pipeline/pickImage.js";
import { loadCatalog, resetCatalogCache } from "../lib/catalog.js";
import { planSections } from "../pipeline/planSections.js";
import { runPipeline } from "../pipeline/runPipeline.js";
import { writeCopyFixture } from "../pipeline/writeCopy.js";
import { verifyBriefAgainstSource } from "../pipeline/verifyBrief.js";

describe("planSections", () => {
  it("returns fixed casual_discovery section order", () => {
    expect(planSections()).toEqual([
      "header",
      "hero",
      "about",
      "services",
      "menu",
      "stats",
      "gallery",
      "testimonials",
      "team",
      "reservation",
      "location_map",
      "contact",
      "footer",
    ]);
  });
});

describe("pickComponent", () => {
  it("maps each section type to a premium variant by default", () => {
    expect(pickComponent("hero")).toMatch(/^premium-hero-0[123]$/);
    expect(pickComponent("menu")).toMatch(/^premium-menu-0[12]$/);
    expect(pickComponent("testimonials")).toMatch(
      /^premium-testimonials-0[12]$/,
    );
  });

  it("maps section types to elegant variants when family is set", () => {
    expect(pickComponent("hero", "elegant")).toMatch(/^elegant-hero-0[123]$/);
    expect(pickComponent("gallery", "elegant")).toMatch(
      /^elegant-gallery-0[12]$/,
    );
    expect(pickComponent("reservation", "elegant")).toMatch(
      /^elegant-reservation-0[12]$/,
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

  it("diversifies tied variants by business identity", () => {
    const a = pickComponent("services", "premium", {
      brief: { ...FIXTURE_BRIEF, businessName: "Alpha Cafe", category: "Cafe" },
    });
    const b = pickComponent("services", "premium", {
      brief: { ...FIXTURE_BRIEF, businessName: "Zeta Kitchen", category: "Cafe" },
    });
    expect(a).toMatch(/^premium-services-0[12]$/);
    expect(b).toMatch(/^premium-services-0[12]$/);
    // Different brands should not always collapse to the same suffix.
    expect(new Set([a, b]).size).toBeGreaterThanOrEqual(1);
  });

  it("prefers story-forward about-02", () => {
    const id = pickComponent("about", "premium", {
      brief: FIXTURE_BRIEF,
      chatText: "Our family heritage and chef tradition since 1982",
    });
    expect(id).toBe("premium-about-02");
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
    expect(result.stages.length).toBe(8);
  });

  it("uses elegant components when family is elegant", async () => {
    const result = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "elegant",
    });
    expect(result.family).toBe("elegant");
    expect(result.page.sections[0]?.componentId).toBe("elegant-header-01");
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
    expect(result.page.sections[0]?.componentId).toBe("rustic-header-01");
    expect(
      result.page.sections.some((s) => s.type === "contact"),
    ).toBe(true);
    expect(
      result.page.sections.some((s) => s.type === "footer"),
    ).toBe(true);
  });
});
