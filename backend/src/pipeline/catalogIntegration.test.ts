import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { runPipeline, type PipelineResult } from "./runPipeline.js";
import { BENCHMARK_CASES } from "../../benchmarks/cases.js";
import { getSpec } from "../catalog/index.js";
import { checkPageContentContracts } from "./contentContract.js";
import { pageSchema } from "../schemas/page.schema.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The frontend registry keys, so a selected component is known to render.
 */
function renderableIds(): Set<string> {
  const dir = join(HERE, "../../../frontend/src/components");
  const ids = new Set<string>();
  for (const file of [
    "premium/registry.ts",
    "elegant/registry.ts",
    "bold/registry.ts",
    "familyKit/createFamilyRegistry.tsx",
    "familyKit/sections/HeaderContactFooter.tsx",
    "familyKit/sections/FamilyHeaders.tsx",
  ]) {
    const source = readFileSync(join(dir, file), "utf8");
    for (const m of source.matchAll(/"([a-z]+-[a-z_]+-\d{2})"/g)) ids.add(m[1]!);
    for (const m of source.matchAll(/\$\{family\}-([a-z_]+-\d{2})/g)) {
      for (const family of ["minimal", "rustic", "vibrant", "bold"]) {
        ids.add(`${family}-${m[1]!}`);
      }
    }
  }
  return ids;
}

const results = new Map<string, PipelineResult>();

beforeAll(async () => {
  process.env.PIPELINE_STAGE_DELAY = "0";
  for (const testCase of BENCHMARK_CASES) {
    results.set(
      testCase.id,
      await runPipeline({
        chatText: testCase.prompt,
        brief: testCase.brief,
        useFixture: true,
      }),
    );
  }
}, 30_000);

describe("design DNA to rendered component", () => {
  it("routes every selection through the catalog", () => {
    for (const [id, result] of results) {
      const legacy = result.selection.filter((t) => t.source === "legacy");
      expect(
        legacy.map((t) => `${t.section}:${t.chosen}`),
        `${id} still used the legacy picker`,
      ).toEqual([]);
    }
  });

  it("gives every selected component a spec", () => {
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        for (const section of generated.page.sections) {
          expect(
            getSpec(section.componentId),
            `${id}: ${section.componentId} has no spec`,
          ).not.toBeNull();
        }
      }
    }
  });

  it("only ever selects a component the renderer can render", () => {
    const renderable = renderableIds();
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        for (const section of generated.page.sections) {
          expect(
            renderable.has(section.componentId),
            `${id} selected unrenderable ${section.componentId}`,
          ).toBe(true);
        }
      }
    }
  });

  it("selects a component whose spec matches the section it fills", () => {
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        for (const section of generated.page.sections) {
          const spec = getSpec(section.componentId);
          if (!spec) continue;
          expect(spec.section, `${id}: ${section.componentId}`).toBe(section.type);
        }
      }
    }
  });

  it("honours each component's media contract", () => {
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        for (const section of generated.page.sections) {
          const spec = getSpec(section.componentId);
          if (!spec) continue;
          const count = section.assets.length;
          expect(count, `${id}: ${spec.id} got ${count} images`).toBeGreaterThanOrEqual(
            spec.media.min,
          );
          expect(count, `${id}: ${spec.id} got ${count} images`).toBeLessThanOrEqual(
            spec.media.max,
          );
        }
      }
    }
  });

  it("respects the surface the plan asked for", () => {
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        for (const section of generated.page.sections) {
          const spec = getSpec(section.componentId);
          if (!spec || !section.layout) continue;
          expect(
            spec.surfaces,
            `${id}: ${spec.id} on ${section.layout.background}`,
          ).toContain(section.layout.background);
        }
      }
    }
  });

  it("produces Page JSON the renderer contract accepts", () => {
    for (const [, result] of results) {
      for (const generated of result.pages) {
        expect(() => pageSchema.parse(generated.page)).not.toThrow();
      }
    }
  });

  it("meets the content contracts of every catalog component", () => {
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        const violations = checkPageContentContracts(generated.page.sections);
        // Fixture copy is not length-tuned, so only required-field gaps fail.
        const missing = violations.filter((v) => v.kind === "missing");
        expect(missing, `${id} ${generated.path}`).toEqual([]);
      }
    }
  });

  it("records a readable reason for every selection", () => {
    for (const [, result] of results) {
      for (const trace of result.selection) {
        expect(trace.explain.length).toBeGreaterThan(0);
        if (trace.source === "catalog") {
          expect(trace.candidates).toBeGreaterThan(0);
          expect(trace.scores?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("produces a component id the registry naming contract accepts", () => {
    for (const [, result] of results) {
      for (const trace of result.selection) {
        expect(trace.chosen).toMatch(/^[a-z]+-[a-z_]+-\d{2}$/);
      }
    }
  });
});
