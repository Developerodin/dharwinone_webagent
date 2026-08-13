import { describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { CreativeDirection, SectionPlanItem } from "../schemas/creativeDirection.schema.js";
import { planSections } from "./planSections.js";

/**
 * Builds a minimal CreativeDirection with a sectionPlan for tests.
 */
function makeDirection(sectionPlan: SectionPlanItem[]): CreativeDirection {
  return {
    family: "premium",
    seed: "test-seed",
    palette: null,
    paletteSource: "creative_pick",
    sectionVariantHints: {},
    rationale: "test",
    sectionPlan,
  };
}

/**
 * Minimal brief factory for section-planning tests.
 */
function makeBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    ...FIXTURE_BRIEF,
    ...overrides,
  };
}

describe("planSections data gates", () => {
  it("omits testimonials and team when brief has no real proof data", () => {
    const sections = planSections({
      brief: makeBrief({ testimonials: [], team: [] }),
    });
    expect(sections).not.toContain("testimonials");
    expect(sections).not.toContain("team");
  });

  it("includes core spine sections", () => {
    const sections = planSections({ brief: makeBrief() });
    expect(sections[0]).toBe("header");
    expect(sections).toContain("hero");
    expect(sections).toContain("menu");
    expect(sections[sections.length - 1]).toBe("footer");
  });

  it("includes services only when cues yield ≥3 real cards", () => {
    const withCues = planSections({
      brief: makeBrief(),
      chatText: "We offer catering, private dining, and delivery",
    });
    expect(withCues).toContain("services");

    const without = planSections({
      brief: makeBrief(),
      chatText: "A quiet neighbourhood dinner spot",
    });
    expect(without).not.toContain("services");
  });

  it("includes testimonials when brief provides real quotes", () => {
    const sections = planSections({
      brief: makeBrief({
        testimonials: [
          { quote: "Great pasta", name: "Ada", source: null, role: "Guest" },
          { quote: "Loved it", name: "Bo", source: null, role: "Guest" },
        ],
      }),
    });
    expect(sections).toContain("testimonials");
  });
});

describe("planSections sectionPlan direction", () => {
  it("follows sectionPlan ordering from Creative Director", () => {
    const plan: SectionPlanItem[] = [
      { type: "header", emphasis: "standard", layoutIntent: "band", background: "base", spacing: "normal" },
      { type: "hero", emphasis: "hero", layoutIntent: "full_bleed", background: "image", spacing: "roomy" },
      { type: "menu", emphasis: "major", layoutIntent: "grid", background: "alt", spacing: "normal" },
      { type: "about", emphasis: "major", layoutIntent: "split_left", background: "base", spacing: "normal" },
      { type: "gallery", emphasis: "standard", layoutIntent: "grid", background: "base", spacing: "normal" },
      { type: "footer", emphasis: "compact", layoutIntent: "band", background: "base", spacing: "tight" },
    ];
    const sections = planSections({ brief: makeBrief(), direction: makeDirection(plan) });
    // menu must precede about (sectionPlan override vs default about-first order)
    expect(sections.indexOf("menu")).toBeLessThan(sections.indexOf("about"));
    expect(sections[0]).toBe("header");
    expect(sections[sections.length - 1]).toBe("footer");
  });

  it("data-gates still drop testimonials without data when sectionPlan includes them", () => {
    const plan: SectionPlanItem[] = [
      { type: "header", emphasis: "standard", layoutIntent: "band", background: "base", spacing: "normal" },
      { type: "hero", emphasis: "hero", layoutIntent: "full_bleed", background: "image", spacing: "roomy" },
      { type: "testimonials", emphasis: "major", layoutIntent: "centered", background: "alt", spacing: "normal" },
      { type: "footer", emphasis: "compact", layoutIntent: "band", background: "base", spacing: "tight" },
    ];
    // brief has no testimonials — should be dropped despite being in sectionPlan
    const sections = planSections({ brief: makeBrief({ testimonials: [] }), direction: makeDirection(plan) });
    expect(sections).not.toContain("testimonials");
  });

  it("falls back to keyword planner when no sectionPlan in direction", () => {
    const direction = makeDirection([]); // empty plan = no sectionPlan
    const withPlan = planSections({ brief: makeBrief(), direction: { ...direction, sectionPlan: undefined } });
    const withoutPlan = planSections({ brief: makeBrief() });
    expect(withPlan).toEqual(withoutPlan);
  });
});
