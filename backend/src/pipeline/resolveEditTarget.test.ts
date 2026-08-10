import { describe, expect, it } from "vitest";
import { hasExplicitNameSignal } from "./hasExplicitNameSignal.js";
import {
  findCopyTarget,
  inferEditSection,
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
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
});
