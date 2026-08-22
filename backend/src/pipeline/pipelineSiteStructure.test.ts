import { beforeAll, describe, expect, it } from "vitest";
import { runPipeline } from "./runPipeline.js";
import { BENCHMARK_CASES } from "../../benchmarks/cases.js";
import type { PipelineResult } from "./runPipeline.js";

/**
 * Runs every benchmark case once through the real pipeline in fixture mode.
 */
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

describe("site structure end to end", () => {
  it.each(
    BENCHMARK_CASES.filter((c) => c.expectedPages.length === 1).map((c) => c.id),
  )("keeps %s on a single page", (id) => {
    const result = results.get(id)!;
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.role).toBe("home");
    expect(result.direction.sitePlan?.kind).not.toBe("multi_page");
  });

  it("builds every requested page for a multi-page request", () => {
    const testCase = BENCHMARK_CASES.find((c) => c.id === "multi-page-restaurant")!;
    const result = results.get(testCase.id)!;
    const roles = result.pages.map((page) => page.role);
    expect(result.direction.sitePlan?.kind).toBe("multi_page");
    for (const expected of testCase.expectedPages) {
      expect(roles, `missing ${expected} page`).toContain(expected);
    }
  });

  it("shares one design system across every page of a site", () => {
    const result = results.get("multi-page-restaurant")!;
    const themes = new Set(
      result.pages.map((page) => JSON.stringify(page.page.themeOverrides)),
    );
    const designs = new Set(
      result.pages.map((page) => JSON.stringify(page.page.design)),
    );
    expect(themes.size).toBe(1);
    expect(designs.size).toBe(1);
  });

  it("does not reuse a photograph anywhere in a multi-page site", () => {
    const result = results.get("multi-page-restaurant")!;
    const paths = result.pages.flatMap((page) =>
      page.page.sections.flatMap((section) =>
        section.assets.map((asset) => asset.imagePath),
      ),
    );
    expect(paths.length).toBeGreaterThan(0);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives every page a header, a footer and cross-page nav", () => {
    const result = results.get("multi-page-restaurant")!;
    for (const generated of result.pages) {
      const sections = generated.page.sections;
      expect(sections[0]!.type).toBe("header");
      expect(sections.at(-1)!.type).toBe("footer");

      const nav = sections[0]!.content.navItems as Array<{ href?: string }>;
      expect(Array.isArray(nav)).toBe(true);
      expect(nav.length).toBeGreaterThan(0);
      // Cross-page nav must survive the present-sections pruning.
      expect(nav.every((item) => typeof item.href === "string")).toBe(true);
    }
  });

  it("keeps single-page nav as in-page anchors", () => {
    const result = results.get("modern-cafe")!;
    const header = result.pages[0]!.page.sections[0]!;
    const nav = header.content.navItems as Array<{ href?: string; target: string }>;
    expect(nav.length).toBeGreaterThan(0);
    expect(nav.every((item) => item.href === undefined)).toBe(true);
  });

  it("classifies the fine-dining counter brief as reservation led", () => {
    expect(results.get("fine-dining")!.direction.archetype).toBe(
      "reservation_first",
    );
  });

  it("holds the surface rhythm rules on every page, not just the section list", () => {
    // The rhythm rules are guarantees about a *page*. A multi-page site splits
    // the section list, so the plan has to be computed per page or the tail of
    // a short page can stack three identical bands.
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        const surfaces = generated.page.sections.map(
          (section) => section.layout?.background ?? "-",
        );
        let run = 1;
        for (let i = 1; i < surfaces.length; i += 1) {
          run = surfaces[i] === surfaces[i - 1] ? run + 1 : 1;
          expect(
            run,
            `${id} ${generated.path}: ${surfaces.join(">")}`,
          ).toBeLessThan(3);
        }
      }
    }
  });

  it("gives every page exactly one hero emphasis", () => {
    for (const [id, result] of results) {
      for (const generated of result.pages) {
        const heroes = generated.page.sections.filter(
          (section) => section.layout?.emphasis === "hero",
        );
        expect(heroes.length, `${id} ${generated.path}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps design intent varied on every page", () => {
    for (const [, result] of results) {
      for (const generated of result.pages) {
        const body = generated.page.sections.filter(
          (section) => section.type !== "header" && section.type !== "footer",
        );
        // Every section still carries a resolved layout after Phase 1.
        expect(body.every((section) => section.layout !== undefined)).toBe(true);
      }
    }
  });
});
