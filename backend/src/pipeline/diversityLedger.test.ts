import { describe, expect, it } from "vitest";
import {
  cohortKey,
  InMemoryDiversityLedger,
  measurePressure,
  NULL_LEDGER,
  type BuildFingerprint,
} from "./diversityLedger.js";
import { runPipeline } from "./runPipeline.js";
import { rankCandidates, scoreCandidate, type RankContext } from "./rankComponents.js";
import { findCandidates, getSpec } from "../catalog/index.js";
import { BENCHMARK_CASES } from "../../benchmarks/cases.js";
import type { SectionPlanItem } from "../schemas/creativeDirection.schema.js";
import type { Brief } from "../schemas/brief.schema.js";

/**
 * Builds a fingerprint for a cohort.
 */
function fingerprint(overrides: Partial<BuildFingerprint> = {}): BuildFingerprint {
  return {
    cohort: "premium:story_led",
    components: ["premium-hero-01", "premium-about-01"],
    layoutsBySection: [
      { section: "hero", layoutFamily: "immersive" },
      { section: "about", layoutFamily: "split" },
    ],
    compositionSignature: "immersive>split",
    ...overrides,
  };
}

describe("diversity ledger", () => {
  it("reports no pressure when it has seen nothing", () => {
    const pressure = measurePressure(NULL_LEDGER, "premium:story_led");
    expect(pressure.sampleSize).toBe(0);
    expect(pressure.componentRate("premium-hero-01")).toBe(0);
  });

  it("measures how saturated a choice is", () => {
    const ledger = new InMemoryDiversityLedger();
    ledger.record(fingerprint());
    ledger.record(fingerprint({ components: ["premium-hero-01"] }));
    ledger.record(fingerprint({ components: ["premium-hero-02"] }));

    const pressure = measurePressure(ledger, "premium:story_led");
    expect(pressure.sampleSize).toBe(3);
    expect(pressure.componentRate("premium-hero-01")).toBeCloseTo(2 / 3);
    expect(pressure.componentRate("premium-hero-02")).toBeCloseTo(1 / 3);
    expect(pressure.componentRate("premium-hero-03")).toBe(0);
  });

  it("keeps cohorts separate", () => {
    const ledger = new InMemoryDiversityLedger();
    ledger.record(fingerprint({ cohort: "premium:story_led" }));
    expect(measurePressure(ledger, "elegant:reservation_first").sampleSize).toBe(0);
  });

  it("bounds how much history it keeps", () => {
    const ledger = new InMemoryDiversityLedger(3);
    for (let i = 0; i < 10; i += 1) ledger.record(fingerprint());
    expect(measurePressure(ledger, "premium:story_led").sampleSize).toBe(3);
  });

  it("orders surface programs from least to most used", () => {
    const ledger = new InMemoryDiversityLedger();
    ledger.record(fingerprint({ surfaceProgram: "dark-spine" }));
    ledger.record(fingerprint({ surfaceProgram: "dark-spine" }));
    ledger.record(fingerprint({ surfaceProgram: "paper" }));
    const order = measurePressure(ledger, "premium:story_led").leastUsedPrograms([
      "dark-spine",
      "paper",
      "alternating",
    ]);
    expect(order[0]).toBe("alternating");
    expect(order.at(-1)).toBe("dark-spine");
  });

  it("builds a cohort key from family and archetype", () => {
    expect(cohortKey("premium", "story_led")).toBe("premium:story_led");
    expect(cohortKey("premium", undefined)).toBe("premium:unknown");
  });
});

/**
 * Builds a ranking context.
 */
function context(overrides: Partial<RankContext> = {}): RankContext {
  const plan: SectionPlanItem = {
    type: "about",
    emphasis: "standard",
    layoutIntent: "split_left",
    background: "base",
    spacing: "normal",
  };
  return {
    plan,
    dnaStyles: [],
    dnaDensity: "normal",
    previous: null,
    usedLayoutFamilies: [],
    seed: "seed",
    ...overrides,
  };
}

describe("diversity never overrides correctness", () => {
  it("cannot make a badly-matched component beat a well-matched one", () => {
    const ledger = new InMemoryDiversityLedger();
    // Saturate the correct answer as hard as possible.
    for (let i = 0; i < 12; i += 1) {
      ledger.record(
        fingerprint({
          components: ["premium-about-01"],
          layoutsBySection: [{ section: "about", layoutFamily: "split" }],
        }),
      );
    }
    const pressure = measurePressure(ledger, "premium:story_led");

    const wellMatched = getSpec("premium-about-01")!; // split, matches the plan
    const poorlyMatched = getSpec("premium-about-02")!; // editorial, does not

    const withPressure = context({ pressure });
    expect(
      scoreCandidate(wellMatched, withPressure).total,
    ).toBeGreaterThan(scoreCandidate(poorlyMatched, withPressure).total);
  });

  it("does break a near-tie in favour of the fresher choice", () => {
    // gallery-01 and gallery-02 are both grids, so the plan scores them
    // identically. Only one has been shipped repeatedly.
    const ledger = new InMemoryDiversityLedger();
    for (let i = 0; i < 3; i += 1) {
      ledger.record(
        fingerprint({
          components: ["premium-gallery-01"],
          layoutsBySection: [{ section: "gallery", layoutFamily: "grid" }],
        }),
      );
    }
    const pressure = measurePressure(ledger, "premium:story_led");
    const plan: SectionPlanItem = {
      type: "gallery",
      emphasis: "standard",
      layoutIntent: "grid",
      background: "base",
      spacing: "normal",
    };
    const candidates = findCandidates({ section: "gallery", family: "premium" });

    const without = rankCandidates(candidates, context({ plan }));
    const withLedger = rankCandidates(candidates, context({ plan, pressure }));

    expect(without.chosen!.id).toBe("premium-gallery-01");
    expect(withLedger.chosen!.id).not.toBe("premium-gallery-01");
  });

  it("explains why the diversity score changed", () => {
    const ledger = new InMemoryDiversityLedger();
    ledger.record(fingerprint({ components: ["premium-about-01"] }));
    const pressure = measurePressure(ledger, "premium:story_led");
    const term = scoreCandidate(getSpec("premium-about-01")!, context({ pressure }))
      .terms.find((entry) => entry.name === "diversityPenalty");
    expect(term).toBeTruthy();
    expect(term!.why).toMatch(/comparable build/);
  });
});

describe("cross-build divergence", () => {
  /**
   * Two near-identical businesses, generated one after another.
   */
  async function buildPair(ledger?: InMemoryDiversityLedger) {
    process.env.PIPELINE_STAGE_DELAY = "0";
    const base = BENCHMARK_CASES.find((c) => c.id === "casual-restaurant")!;
    const second: Brief = {
      ...base.brief,
      businessName: "Trattoria Due",
    };
    const a = await runPipeline({
      chatText: base.prompt, brief: base.brief, useFixture: true, ledger,
    });
    const b = await runPipeline({
      chatText: base.prompt, brief: second, useFixture: true, ledger,
    });
    return { a, b };
  }

  it("makes a second comparable site differ from the first", async () => {
    const withoutLedger = await buildPair();
    const withLedger = await buildPair(new InMemoryDiversityLedger());

    const overlap = (x: typeof withoutLedger) => {
      const first = new Set(x.a.fingerprint.components);
      const shared = x.b.fingerprint.components.filter((id) => first.has(id));
      return shared.length / x.b.fingerprint.components.length;
    };

    expect(overlap(withLedger)).toBeLessThan(overlap(withoutLedger));
  });

  it("is deterministic for the same inputs and the same ledger state", async () => {
    const first = await buildPair(new InMemoryDiversityLedger());
    const second = await buildPair(new InMemoryDiversityLedger());
    expect(second.b.fingerprint.components).toEqual(first.b.fingerprint.components);
    expect(second.b.fingerprint.compositionSignature).toBe(
      first.b.fingerprint.compositionSignature,
    );
  });

  it("records what the build used", async () => {
    const ledger = new InMemoryDiversityLedger();
    const { a } = await buildPair(ledger);
    expect(a.fingerprint.components.length).toBeGreaterThan(0);
    expect(a.fingerprint.compositionSignature).toContain(">");
    expect(measurePressure(ledger, a.fingerprint.cohort).sampleSize).toBeGreaterThan(0);
  });
});
