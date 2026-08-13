import { describe, expect, it } from "vitest";
import {
  contrastForAccent,
  deriveSurfaceTokens,
  luminance,
  resolveColor,
  resolveFont,
} from "./colorResolve.js";
import { applyMatchColor, textFieldToPlain } from "./textRuns.js";
import {
  classifyIntentHeuristic,
  isClearEditHeuristic,
} from "./askAgent.js";
import { applyThemeTokensOp, applyTextStyleOp } from "./applyStyleOps.js";
import { applyAddSectionOp, applyRemoveSectionOp } from "./applyLayoutOps.js";
import { parseEditOpsFixture } from "./parseEditOps.js";
import { isCycleSectionComponentIntent } from "./resolveEditTarget.js";
import type { Page } from "../schemas/page.schema.js";
import type { Brief } from "../schemas/brief.schema.js";

const brief: Brief = {
  businessName: "Test Bistro",
  category: "Italian",
  phone: null,
  address: null,
  menuItems: [],
  photos: [],
  brandColors: null,
};

/**
 * Minimal page fixture for style/layout ops.
 */
function samplePage(): Page {
  return {
    sections: [
      {
        type: "header",
        componentId: "premium-header-01",
        content: { brandName: "Test", navItems: [] },
        assets: [],
      },
      {
        type: "hero",
        componentId: "premium-hero-01",
        content: {
          headline: "Discover the Essence of Italy in Every Bite!",
          subheading: "Hello",
          ctaLabel: "Menu",
        },
        assets: [],
      },
      {
        type: "footer",
        componentId: "premium-footer-01",
        content: { brandName: "Test" },
        assets: [],
      },
    ],
  };
}

describe("resolveColor", () => {
  it("resolves names and hex", () => {
    expect(resolveColor("red")).toBe("#ef4444");
    expect(resolveColor("#0f0")).toBe("#00ff00");
    expect(resolveColor("c9a962")).toBe("#c9a962");
    expect(resolveColor("not-a-color")).toBeNull();
  });

  it("strips junk and resolves compound names", () => {
    expect(resolveColor("/#FF0000")).toBe("#ff0000");
    expect(resolveColor('"#22c55e"')).toBe("#22c55e");
    expect(resolveColor("dark green")).toBe("#166534");
    expect(resolveColor("light grey")).toBe("#d3d3d3");
    expect(resolveColor("forest green")).toBe("#166534");
  });

  it("derives light-safe surface tokens for B/W palettes", () => {
    const surfaces = deriveSurfaceTokens({ bg: "#ffffff", ink: "#000000" });
    expect(surfaces).toBeTruthy();
    expect(luminance(surfaces!.bgDark)).toBeGreaterThan(0.5);
    expect(surfaces!.bgDark).not.toBe("#08090c");
    expect(luminance(surfaces!.card)).toBeGreaterThan(0.5);
    expect(surfaces!.onDark).toBe("#000000");
  });

  it("picks contrast for accent", () => {
    expect(contrastForAccent("#ef4444")).toBe("#ffffff");
    expect(contrastForAccent("#f5f0e8")).toBe("#111111");
  });

  it("resolves fonts", () => {
    expect(resolveFont("serif")).toContain("Instrument Serif");
    expect(resolveFont("sans")).toContain("Geist");
  });
});

describe("edit routing fixtures", () => {
  it("maps surprise me to remix_layout only", () => {
    const parsed = parseEditOpsFixture("surprise me");
    expect(parsed.ops).toEqual([{ op: "remix_layout", salt: null }]);
    expect(classifyIntentHeuristic("surprise me").intent).toBe("edit");
    expect(isClearEditHeuristic("surprise me")).toBe(true);
  });

  it("maps header change to cycle_section_component header only", () => {
    expect(isCycleSectionComponentIntent("change the header component")).toBe(
      true,
    );
    const parsed = parseEditOpsFixture(
      "the current header ui is not good use something else in header",
    );
    expect(parsed.ops).toEqual([
      { op: "cycle_section_component", section: "header" },
    ]);
  });

  it("maps switch header layout explicitly", () => {
    expect(parseEditOpsFixture("switch header layout").ops[0]).toEqual({
      op: "cycle_section_component",
      section: "header",
    });
  });

  it("maps black and white to theme tokens with surfaces", () => {
    const page = samplePage();
    const parsed = parseEditOpsFixture("change the theme color to black and white only");
    expect(parsed.ops.some((op) => op.op === "set_theme_tokens")).toBe(true);
    const tokenOp = parsed.ops.find((op) => op.op === "set_theme_tokens");
    if (tokenOp?.op === "set_theme_tokens") {
      applyThemeTokensOp(page, tokenOp);
    }
    expect(page.themeOverrides?.bg).toBe("#ffffff");
    expect(page.themeOverrides?.ink).toBe("#111111");
    expect(page.themeOverrides?.bgDark).toBeTruthy();
    expect(luminance(page.themeOverrides!.bgDark!)).toBeGreaterThan(0.5);
  });

  it("maps our story section colors to about set_section_style", () => {
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

  it("maps story section background phrase order to about", () => {
    const parsed = parseEditOpsFixture(
      "change the background of the story section to white",
    );
    const style = parsed.ops.find((op) => op.op === "set_section_style");
    expect(style).toMatchObject({
      op: "set_section_style",
      section: "about",
      background: "white",
    });
  });
});

describe("text runs", () => {
  it("colors a matched substring", () => {
    const styled = applyMatchColor(
      "Discover the Essence of Italy in Every Bite!",
      "Bite!",
      "#ef4444",
    );
    expect(styled).toEqual({
      runs: [
        { text: "Discover the Essence of Italy in Every " },
        { text: "Bite!", color: "#ef4444" },
      ],
    });
    expect(textFieldToPlain(styled)).toBe(
      "Discover the Essence of Italy in Every Bite!",
    );
  });
});

describe("style and layout ops", () => {
  it("sets theme tokens and text style", () => {
    const page = samplePage();
    const note = applyThemeTokensOp(page, {
      op: "set_theme_tokens",
      accent: "green",
      accentContrast: null,
      bg: null,
      bgAlt: null,
      ink: null,
      fontDisplay: "serif",
      fontBody: null,
    });
    expect(note).toContain("accent");
    expect(page.themeOverrides?.accent).toBe("#22c55e");
    expect(page.themeOverrides?.fontDisplay).toContain("Instrument Serif");

    const textNote = applyTextStyleOp(page, {
      op: "set_text_style",
      section: "hero",
      field: "headline",
      match: "Bite!",
      color: "dark green",
    });
    expect(textNote).toContain("Bite!");
    expect(textNote).toContain("#166534");
    const hero = page.sections.find((s) => s.type === "hero");
    expect(textFieldToPlain(hero?.content.headline)).toContain("Bite!");
  });

  it("adds and removes sections with header/footer guards", () => {
    const page = samplePage();
    expect(
      applyAddSectionOp(page, brief, "premium", {
        op: "add_section",
        section: "testimonials",
      }),
    ).toContain("Added");
    expect(page.sections.some((s) => s.type === "testimonials")).toBe(true);

    expect(
      applyRemoveSectionOp(page, { op: "remove_section", section: "header" }),
    ).toContain("Cannot remove");
    expect(
      applyRemoveSectionOp(page, {
        op: "remove_section",
        section: "testimonials",
      }),
    ).toContain("Removed");
  });
});

describe("ask intent heuristic", () => {
  it("routes questions to ask and clear edits to edit", () => {
    expect(classifyIntentHeuristic("what themes are available?").intent).toBe(
      "ask",
    );
    expect(classifyIntentHeuristic("make Bite! red").intent).toBe("edit");
    expect(classifyIntentHeuristic("add testimonials section").intent).toBe(
      "ask",
    );
    expect(
      classifyIntentHeuristic("add testimonials section").proposedEdit,
    ).toBeTruthy();
  });
});
