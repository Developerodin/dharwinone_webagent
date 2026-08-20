import { describe, expect, it } from "vitest";
import {
  composerPlaceholderForPick,
  formatAttachedEditInstruction,
  looksLikeQuestion,
  matchSectionField,
  resolvePreviewPickFromContent,
} from "./resolvePreviewPick";

const heroContent = {
  headline: "Taste The Difference",
  subheading: "Wood-fired plates in Jaipur",
  ctaLabel: "Reserve a table",
  body: "Join us tonight — Reserve a table for wood-fired plates and wine.",
};

describe("matchSectionField", () => {
  it("matches a CTA click over body text that also contains the label", () => {
    expect(matchSectionField(heroContent, "Reserve a table")).toBe("ctaLabel");
  });

  it("matches the headline when the clicked text is the heading", () => {
    expect(matchSectionField(heroContent, "Taste The Difference")).toBe(
      "headline",
    );
  });

  it("returns no field for a section-root click", () => {
    expect(
      matchSectionField(heroContent, "Taste The Difference", true),
    ).toBeUndefined();
  });

  it("returns no field when the click wraps multiple distinct fields", () => {
    const wrapped = `${heroContent.headline} ${heroContent.subheading} ${heroContent.ctaLabel}`;
    expect(matchSectionField(heroContent, wrapped)).toBeUndefined();
  });

  it("returns no field for empty / tiny snippets", () => {
    expect(matchSectionField(heroContent, "")).toBeUndefined();
    expect(matchSectionField(heroContent, "R")).toBeUndefined();
  });
});

describe("resolvePreviewPickFromContent", () => {
  it("stays scoped to the clicked section type", () => {
    const pick = resolvePreviewPickFromContent({
      sectionType: "hero",
      content: heroContent,
      tag: "button",
      snippet: "Reserve a table",
    });
    expect(pick).toEqual({
      section: "hero",
      field: "ctaLabel",
      tag: "button",
      snippet: "Reserve a table",
    });
  });

  it("does not steal a footer CTA when resolving a hero click", () => {
    const pick = resolvePreviewPickFromContent({
      sectionType: "hero",
      content: { headline: "Welcome", ctaLabel: "Book now" },
      tag: "button",
      snippet: "Book now",
    });
    expect(pick.section).toBe("hero");
    expect(pick.field).toBe("ctaLabel");
  });

  it("falls back to section-only when nothing matches", () => {
    const pick = resolvePreviewPickFromContent({
      sectionType: "gallery",
      content: { headline: "Moments" },
      tag: "img",
      snippet: "",
      clickedSectionRoot: true,
    });
    expect(pick.field).toBeUndefined();
    expect(pick.tag).toBe("img");
    expect(pick.section).toBe("gallery");
  });
});

describe("formatAttachedEditInstruction", () => {
  it("prefixes the user prompt with section, field, tag, and snippet", () => {
    expect(
      formatAttachedEditInstruction(
        {
          section: "hero",
          field: "ctaLabel",
          tag: "button",
          snippet: 'Reserve a "table"',
        },
        "make this gold",
      ),
    ).toBe(
      '[Attached target: hero.ctaLabel tag=button text="Reserve a \'table\'"]\nmake this gold',
    );
  });
});

describe("composerPlaceholderForPick", () => {
  it("asks the user to click when edit mode has no pick", () => {
    expect(composerPlaceholderForPick(null, true)).toMatch(/Click anything/);
    expect(composerPlaceholderForPick(null, false)).toBeNull();
  });

  it("names the attached field", () => {
    expect(
      composerPlaceholderForPick(
        {
          section: "hero",
          field: "ctaLabel",
          tag: "button",
          snippet: "Reserve a table",
        },
        true,
      ),
    ).toMatch(/CTA/i);
  });
});

describe("looksLikeQuestion", () => {
  it("detects questions vs edit commands", () => {
    expect(looksLikeQuestion("what font is this?")).toBe(true);
    expect(looksLikeQuestion("make this gold")).toBe(false);
  });
});
