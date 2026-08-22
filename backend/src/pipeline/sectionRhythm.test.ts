import { describe, expect, it } from "vitest";
import {
  ALLOWED_INTENTS,
  buildSectionRhythm,
  densityFor,
  isFlatPlan,
  typeScaleFor,
} from "./sectionRhythm.js";
import type { SectionType } from "../schemas/page.schema.js";
import type { SectionPlanItem } from "../schemas/creativeDirection.schema.js";

const FULL_PAGE: SectionType[] = [
  "header", "hero", "about", "menu", "stats",
  "gallery", "reservation", "location_map", "contact", "footer",
];

/**
 * Builds a rhythm for one seed with sensible defaults.
 */
function plan(seed: string, types: SectionType[] = FULL_PAGE) {
  return buildSectionRhythm({
    sectionTypes: types,
    seed,
    density: "normal",
    signatureSection: "menu",
  });
}

/** Longest run of the same value in a list. */
function longestRun<T>(values: T[]): number {
  let best = 0;
  let run = 0;
  let previous: T | null = null;
  for (const value of values) {
    run = value === previous ? run + 1 : 1;
    previous = value;
    best = Math.max(best, run);
  }
  return best;
}

describe("buildSectionRhythm", () => {
  it("never runs the same surface three sections deep", () => {
    for (const seed of ["a|cafe", "b|bakery", "c|fine", "d|bbq", "e|coffee"]) {
      const surfaces = plan(seed).map((item) => item.background);
      expect(longestRun(surfaces)).toBeLessThan(3);
    }
  });

  it("never repeats a layout intent back to back", () => {
    for (const seed of ["a|cafe", "b|bakery", "c|fine", "d|bbq"]) {
      const intents = plan(seed).map((item) => item.layoutIntent);
      expect(longestRun(intents)).toBe(1);
    }
  });

  it("only picks intents the section type can render", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      for (const item of plan(seed)) {
        expect(ALLOWED_INTENTS[item.type]).toContain(item.layoutIntent);
      }
    }
  });

  it("gives the page exactly one hero emphasis", () => {
    const heroes = plan("seed").filter((item) => item.emphasis === "hero");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]!.type).toBe("hero");
  });

  it("always lands at least one heavy band in the body", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g"]) {
      const heavy = plan(seed).filter(
        (item) => item.background === "dark" || item.background === "accent",
      );
      expect(heavy.length).toBeGreaterThan(0);
    }
  });

  it("produces different surface rhythms for different seeds", () => {
    const signatures = new Set(
      ["cafe|a", "bakery|b", "fine|c", "bbq|d", "coffee|e", "seafood|f"].map(
        (seed) => plan(seed).map((item) => item.background).join(">"),
      ),
    );
    expect(signatures.size).toBeGreaterThanOrEqual(3);
  });

  it("never asks for an image surface behind a side-by-side layout", () => {
    // A split composition puts media beside the copy; an "image" background
    // puts it behind. Both at once describes a component that cannot exist.
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]) {
      for (const item of plan(seed)) {
        if (item.background !== "image") continue;
        expect(
          ["full_bleed", "centered", "overlap"],
          `${item.type} wants image behind ${item.layoutIntent}`,
        ).toContain(item.layoutIntent);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const first = plan("stable|seed");
    const second = plan("stable|seed");
    expect(second).toEqual(first);
  });

  it("scales spacing with density", () => {
    const types: SectionType[] = ["header", "hero", "about", "footer"];
    const spacious = buildSectionRhythm({
      sectionTypes: types, seed: "s", density: "spacious", signatureSection: null,
    });
    const compact = buildSectionRhythm({
      sectionTypes: types, seed: "s", density: "compact", signatureSection: null,
    });
    const about = (items: SectionPlanItem[]) =>
      items.find((item) => item.type === "about")!.spacing;
    expect(about(spacious)).toBe("roomy");
    expect(about(compact)).not.toBe("roomy");
  });

  it("keeps a non-flat LLM plan's surfaces but repairs a flat one", () => {
    const types: SectionType[] = ["header", "hero", "about", "menu", "gallery", "footer"];
    const flat: SectionPlanItem[] = types.map((type) => ({
      type,
      emphasis: "standard",
      layoutIntent: "centered",
      background: "base",
      spacing: "normal",
    }));
    const repaired = buildSectionRhythm({
      sectionTypes: types, seed: "x", density: "normal",
      signatureSection: "menu", existing: flat,
    });
    const bodySurfaces = repaired
      .filter((i) => !["header", "hero", "footer"].includes(i.type))
      .map((i) => i.background);
    expect(new Set(bodySurfaces).size).toBeGreaterThan(1);
  });

  it("detects a flat plan", () => {
    const flat: SectionPlanItem[] = (["about", "menu", "gallery"] as SectionType[]).map(
      (type) => ({
        type, emphasis: "standard", layoutIntent: "grid",
        background: "base", spacing: "normal",
      }),
    );
    expect(isFlatPlan(flat)).toBe(true);
    expect(isFlatPlan([...flat, { ...flat[0]!, type: "stats", background: "dark" }])).toBe(false);
  });
});

describe("density and type scale", () => {
  it("reads fine dining and quiet vibes as spacious", () => {
    expect(densityFor("fine_dining", [])).toBe("spacious");
    expect(densityFor(null, ["quiet", "spare"])).toBe("spacious");
  });

  it("reads budget and loud vibes as compact", () => {
    expect(densityFor("budget", [])).toBe("compact");
    expect(densityFor(null, ["loud"])).toBe("compact");
  });

  it("defaults to normal", () => {
    expect(densityFor("mid", ["warm"])).toBe("normal");
  });

  it("pairs an expressive type scale with spacious density", () => {
    expect(typeScaleFor("spacious", "fine_dining")).toBe("expressive");
    expect(typeScaleFor("compact", "budget")).toBe("compact");
    expect(typeScaleFor("normal", "mid")).toBe("normal");
  });
});
