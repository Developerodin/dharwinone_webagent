import { describe, expect, it } from "vitest";
import { explainChoice, rankCandidates, scoreCandidate, type RankContext } from "./rankComponents.js";
import { findCandidates, getSpec } from "../catalog/index.js";
import type { SectionPlanItem } from "../schemas/creativeDirection.schema.js";

/**
 * Builds a plan item with sensible defaults.
 */
function plan(overrides: Partial<SectionPlanItem> = {}): SectionPlanItem {
  return {
    type: "hero",
    emphasis: "hero",
    layoutIntent: "full_bleed",
    background: "image",
    spacing: "roomy",
    ...overrides,
  };
}

/**
 * Builds a ranking context with sensible defaults.
 */
function context(overrides: Partial<RankContext> = {}): RankContext {
  return {
    plan: plan(),
    dnaStyles: [],
    dnaDensity: "normal",
    previous: null,
    usedLayoutFamilies: [],
    seed: "test",
    ...overrides,
  };
}

describe("candidate ranking", () => {
  it("prefers the component whose composition the plan asked for", () => {
    const candidates = findCandidates({ section: "about", family: "premium" });
    const split = rankCandidates(candidates, context({
      plan: plan({ type: "about", emphasis: "standard", layoutIntent: "split_left", background: "base" }),
    }));
    expect(split.chosen!.layoutFamily).toBe("split");

    const editorial = rankCandidates(candidates, context({
      plan: plan({ type: "about", emphasis: "standard", layoutIntent: "editorial_columns", background: "base" }),
    }));
    expect(editorial.chosen!.layoutFamily).toBe("editorial");
  });

  it("prefers components whose styles match the design DNA", () => {
    const candidates = findCandidates({ section: "hero", family: "premium", surface: "image" });
    const luxury = rankCandidates(candidates, context({ dnaStyles: ["photographic", "bold"] }));
    expect(luxury.chosen!.styles).toEqual(expect.arrayContaining(["photographic"]));
  });

  it("matches visual weight to the planned emphasis", () => {
    const loud = getSpec("premium-reservation-02")!;
    const quiet = getSpec("premium-reservation-01")!;
    const compactPlan = context({
      plan: plan({ type: "reservation", emphasis: "compact", layoutIntent: "band", background: "base" }),
    });
    expect(scoreCandidate(quiet, compactPlan).total).toBeGreaterThan(
      scoreCandidate(loud, compactPlan).total,
    );
  });

  it("penalises repeating the previous layout family", () => {
    const spec = getSpec("premium-gallery-01")!;
    const after = scoreCandidate(spec, context({
      plan: plan({ type: "gallery", emphasis: "standard", layoutIntent: "grid", background: "base" }),
      previous: getSpec("premium-testimonials-02")!, // also a grid
    }));
    const term = after.terms.find((t) => t.name === "repetitionPenalty");
    expect(term).toBeTruthy();
    expect(term!.delta).toBeLessThan(0);
  });

  it("penalises stacking two dense bands", () => {
    const dense = getSpec("premium-gallery-01")!; // density 4
    const result = scoreCandidate(dense, context({
      plan: plan({ type: "gallery", emphasis: "standard", layoutIntent: "grid", background: "base" }),
      previous: getSpec("premium-menu-02")!, // density 4
    }));
    expect(result.terms.some((t) => t.name === "densityStackPenalty")).toBe(true);
  });

  it("honours an explicit adjacency conflict", () => {
    const spec = getSpec("premium-reservation-02")!; // avoidAfter: immersive
    const result = scoreCandidate(spec, context({
      plan: plan({ type: "reservation", emphasis: "major", layoutIntent: "full_bleed", background: "image" }),
      previous: getSpec("premium-hero-01")!, // immersive
    }));
    const conflict = result.terms.find((t) => t.name === "adjacencyConflict");
    expect(conflict).toBeTruthy();
    expect(conflict!.delta).toBeLessThan(0);
  });

  it("rewards a component designed to follow the previous one", () => {
    const spec = getSpec("premium-about-01")!; // goodAfter: immersive
    const result = scoreCandidate(spec, context({
      plan: plan({ type: "about", emphasis: "standard", layoutIntent: "split_left", background: "base" }),
      previous: getSpec("premium-hero-01")!,
    }));
    expect(result.terms.some((t) => t.name === "adjacencyBonus")).toBe(true);
  });

  it("is deterministic for the same inputs", () => {
    const candidates = findCandidates({ section: "hero", family: "premium", surface: "image" });
    const a = rankCandidates(candidates, context());
    const b = rankCandidates(candidates, context());
    expect(a.chosen!.id).toBe(b.chosen!.id);
    expect(a.ranked.map((r) => r.total)).toEqual(b.ranked.map((r) => r.total));
  });

  it("explains the winner in terms a developer can read", () => {
    const candidates = findCandidates({ section: "about", family: "premium" });
    const result = rankCandidates(candidates, context({
      plan: plan({ type: "about", emphasis: "standard", layoutIntent: "split_left", background: "base" }),
    }));
    const explanation = explainChoice(result);
    expect(explanation).toContain(result.chosen!.id);
    expect(explanation).toMatch(/layoutMatch|styleMatch|emphasisFit/);
  });

  it("returns nothing when there are no candidates", () => {
    const result = rankCandidates([], context());
    expect(result.chosen).toBeNull();
    expect(explainChoice(result)).toBe("no candidates");
  });

  it("gives every score term a human-readable reason", () => {
    const candidates = findCandidates({ section: "hero", family: "premium", surface: "image" });
    for (const entry of rankCandidates(candidates, context()).ranked) {
      for (const term of entry.terms) {
        expect(term.name).toBeTruthy();
        expect(term.why).toBeTruthy();
      }
    }
  });
});
