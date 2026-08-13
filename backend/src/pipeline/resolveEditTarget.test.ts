import { describe, expect, it } from "vitest";
import { hasExplicitNameSignal } from "./hasExplicitNameSignal.js";
import { parseEditOpsFixture } from "./parseEditOps.js";
import { applyMatchColor } from "./textRuns.js";
import {
  defaultCopyField,
  findCopyTarget,
  inferEditSection,
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
  namesFuzzyMatch,
  resolveCopyField,
  resolveEditTarget,
  resolveSectionFromText,
} from "./resolveEditTarget.js";
import type { Page } from "../schemas/page.schema.js";

describe("hasExplicitNameSignal", () => {
  it("rejects cuisine-only / X-based phrasing", () => {
    expect(
      hasExplicitNameSignal(
        "i want to create italinsa based restaurant website serve pasta",
      ),
    ).toBe(false);
  });

  it("accepts my <brand> cafe", () => {
    expect(
      hasExplicitNameSignal(
        "i need a restaurant website for my Chineeh Cafe",
      ),
    ).toBe(true);
  });

  it("accepts restaurant name clarification", () => {
    expect(
      hasExplicitNameSignal(
        "Clarifications:\n- What is the business name?: Italinsa",
      ),
    ).toBe(true);
  });

  it("accepts lowercase website for brand", () => {
    expect(hasExplicitNameSignal("website for dragon wok")).toBe(true);
  });

  it("accepts bare brand reply after prior context", () => {
    expect(
      hasExplicitNameSignal(
        "I want a Chinese restaurant website\n\nDragon Wok",
      ),
    ).toBe(true);
  });
});

describe("resolveEditTarget", () => {
  it("maps moments to gallery", () => {
    expect(inferEditSection("change moments section headline")).toBe("gallery");
  });

  it("detects rewrite intents", () => {
    expect(
      isRewriteCopyIntent(
        "change heading according to you which fit best",
      ),
    ).toBe(true);
    expect(
      isRewriteCopyIntent(
        "Indulge in Authentic Italian Flavors change to something else",
      ),
    ).toBe(true);
  });

  it("detects section layout cycle intents (not copy rewrites)", () => {
    expect(isCycleSectionComponentIntent("change the about section")).toBe(
      true,
    );
    expect(
      isCycleSectionComponentIntent("change the entire hero section"),
    ).toBe(true);
    expect(isCycleSectionComponentIntent("different menu layout")).toBe(true);
    expect(isRewriteCopyIntent("change the about section")).toBe(false);
  });

  it("finds copy by existing text", () => {
    const page: Page = {
      sections: [
        {
          type: "gallery",
          componentId: "elegant-gallery-01",
          content: {
            headline: "Indulge in Authentic Italian Flavors",
            caption: "x",
          },
          assets: [],
        },
        {
          type: "hero",
          componentId: "elegant-hero-01",
          content: { headline: "Authentic Italian Delights" },
          assets: [],
        },
      ],
    };
    expect(
      findCopyTarget(page, "Indulge in Authentic Italian Flavors"),
    ).toEqual({
      section: "gallery",
      field: "headline",
      value: "Indulge in Authentic Italian Flavors",
    });
  });

  it("maps storysection / stry section / our story to about", () => {
    expect(resolveSectionFromText("our storysection")?.section).toBe("about");
    expect(resolveSectionFromText("stry section")?.section).toBe("about");
    expect(inferEditSection("change background of our story")).toBe("about");
  });

  it("maps reviews / guest comments to testimonials", () => {
    expect(inferEditSection("change the reviews section")).toBe(
      "testimonials",
    );
    expect(inferEditSection("update guest comments colors")).toBe(
      "testimonials",
    );
  });

  it("finds copy with near-miss typos", () => {
    const page: Page = {
      sections: [
        {
          type: "gallery",
          componentId: "elegant-gallery-01",
          content: {
            headline: "Indulge in Authentic Italian Flavors",
            caption: "x",
          },
          assets: [],
        },
        {
          type: "hero",
          componentId: "elegant-hero-01",
          content: { headline: "Welcome Home" },
          assets: [],
        },
      ],
    };
    const hit = findCopyTarget(
      page,
      "Indulge in Authenti Italian Flavors",
    );
    expect(hit?.section).toBe("gallery");
    expect(hit?.field).toBe("headline");
  });

  it("maps suhadeing typo to subheading field", () => {
    expect(resolveCopyField("hero", "make the suhadeing black")).toBe(
      "subheading",
    );
  });

  it("prefers headline over body for our story headline", () => {
    expect(defaultCopyField("about", "change our story headline")).toBe(
      "headline",
    );
    expect(
      resolveEditTarget("change our story headline to something better").field,
    ).toBe("headline");
  });

  it("fuzzy-matches menu item names", () => {
    expect(namesFuzzyMatch("Chicken Lollipop", "Chickn Lollipop")).toBe(true);
    expect(namesFuzzyMatch("Margherita Pizza", "Pasta Carbonara")).toBe(false);
  });

  it("colors near-miss substrings in text runs", () => {
    const styled = applyMatchColor(
      "Indulge in Authentic Italian Flavors",
      "Authenti Italian Flavors",
      "#ef4444",
    );
    expect(styled).toBeTruthy();
    if (styled && typeof styled === "object" && "runs" in styled) {
      expect(styled.runs.some((run) => run.color === "#ef4444")).toBe(true);
    }
  });

  it("fixture still maps storysection colors to about", () => {
    const parsed = parseEditOpsFixture(
      "change background color of our storysection to white nad all heading and suhadeing text colro to black",
    );
    expect(parsed.ops).toContainEqual({
      op: "set_section_style",
      section: "about",
      background: "white",
      text: "black",
      button: null,
      paddingY: null,
    });
  });
});
