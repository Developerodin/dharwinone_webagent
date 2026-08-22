import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { componentSpecSchema, type ComponentSpec } from "../schemas/componentSpec.schema.js";
import { rankCandidates, scoreCandidate, type RankContext } from "../pipeline/rankComponents.js";
import type { SectionPlanItem } from "../schemas/creativeDirection.schema.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Every module in the active generation and edit path. None of them may name a
 * specific component or reason about id suffixes: if they do, adding component
 * #500 means editing generation code, which is the thing this architecture
 * exists to prevent.
 */
const SELECTION_PATH = [
  "../pipeline/rankComponents.ts",
  "../pipeline/runPipeline.ts",
  "../pipeline/applyEditOps.ts",
  "../pipeline/defaultSection.ts",
  "../pipeline/creativeDirector.ts",
  "../pipeline/writeAllCopy.ts",
  "../schemas/manifest.schema.ts",
  "./index.ts",
  "./contracts.ts",
  "../schemas/componentSpec.schema.ts",
];

/** Suffix reasoning: `endsWith("-03")`, `suffix === "02"`, and friends. */
const SUFFIX_LOGIC_RE =
  /endsWith\(\s*["'`]-\d{2}["'`]\s*\)|suffix\s*===\s*["'`]\d{2}["'`]|getVariantSuffix|COMPONENT_VARIANTS\[/g;

/** Strips comments so documentation of removed code does not trip the scan. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** A component id literal such as "premium-hero-01". */
const COMPONENT_ID_RE = /["'`][a-z]+-[a-z_]+-\d{2}["'`]/g;

describe("catalog scales without engine changes", () => {
  it.each(SELECTION_PATH)("%s names no specific component", (file) => {
    const source = stripComments(readFileSync(join(HERE, file), "utf8"));
    const hits = source.match(COMPONENT_ID_RE) ?? [];
    expect(hits).toEqual([]);
  });

  it.each(SELECTION_PATH)("%s does not reason about id suffixes", (file) => {
    const source = stripComments(readFileSync(join(HERE, file), "utf8"));
    const hits = source.match(SUFFIX_LOGIC_RE) ?? [];
    expect(hits).toEqual([]);
  });

  it("no longer ships a legacy component picker", () => {
    expect(existsSync(join(HERE, "../pipeline/pickComponent.ts"))).toBe(false);
  });

  it("ranks a component the engine has never seen before", () => {
    // Stand-in for a component added long after this test was written. Nothing
    // in the ranking code knows it exists; it competes purely on its metadata.
    const newcomer: ComponentSpec = componentSpecSchema.parse({
      id: "premium-hero-47",
      section: "hero",
      family: "premium",
      layoutFamily: "split",
      styles: ["editorial", "modern"],
      density: 3,
      visualWeight: 4,
      surfaces: ["base"],
      media: { min: 1, max: 1, role: "atmosphere", orientation: "portrait" },
      slots: { headline: { required: true, maxChars: 60 } },
    } satisfies ComponentSpec);

    const weaker: ComponentSpec = componentSpecSchema.parse({
      ...newcomer,
      id: "premium-hero-48",
      layoutFamily: "grid",
      styles: ["playful"],
      visualWeight: 1,
    } satisfies ComponentSpec);

    const plan: SectionPlanItem = {
      type: "hero",
      emphasis: "hero",
      layoutIntent: "split_left",
      background: "base",
      spacing: "roomy",
    };
    const context: RankContext = {
      plan,
      dnaStyles: ["editorial"],
      dnaDensity: "normal",
      previous: null,
      usedLayoutFamilies: [],
      availableMedia: 4,
      seed: "seed",
    };

    const result = rankCandidates([weaker, newcomer], context);
    expect(result.chosen!.id).toBe("premium-hero-47");
    // And its win is explainable in the same vocabulary as every other pick.
    expect(scoreCandidate(newcomer, context).terms.map((t) => t.name)).toContain(
      "layoutMatch",
    );
  });

  it("keeps every spec field consumed by the selection path", () => {
    // A field nobody reads is metadata rot. This lists where each is used.
    const consumers: Record<string, string> = {
      id: "render + registry lookup",
      section: "findCandidates",
      family: "findCandidates",
      layoutFamily: "layoutMatch + adjacency + variety",
      styles: "styleMatch",
      density: "densityFit + densityStackPenalty",
      visualWeight: "emphasisFit",
      surfaces: "findCandidates surface filter",
      media: "findCandidates gate + buildAssets count",
      slots: "writeAllCopy contract + checkContentContract",
      list: "findCandidates list gate",
      adjacency: "adjacencyBonus / adjacencyConflict",
      industries: "findCandidates industry filter",
    };
    const shape = Object.keys(
      (componentSpecSchema._def.schema as unknown as { shape: Record<string, unknown> }).shape,
    );
    for (const field of shape) {
      expect(consumers[field], `${field} has no documented consumer`).toBeTruthy();
    }
  });
});
