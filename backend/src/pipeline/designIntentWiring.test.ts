import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sectionLayoutSchema } from "../schemas/page.schema.js";
import {
  designDensitySchema,
  designTypeScaleSchema,
} from "../schemas/creativeDirection.schema.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "../../../frontend/src");

const layoutCss = readFileSync(join(FRONTEND, "styles/sectionLayout.css"), "utf8");
const renderer = readFileSync(join(FRONTEND, "render/PageRenderer.tsx"), "utf8");

/**
 * Reads the literal options out of a zod enum used in the layout schema.
 */
function optionsOf(shapeKey: "emphasis" | "intent" | "background" | "spacing"): string[] {
  const shape = sectionLayoutSchema._def.shape();
  const field = shape[shapeKey] as { _def: { innerType?: { options?: string[] }; options?: string[] } };
  return field._def.innerType?.options ?? field._def.options ?? [];
}

/**
 * Every design decision the pipeline can emit must have somewhere to land in
 * the DOM. This is the guard against the class of bug where the Creative
 * Director produces a value that no stylesheet ever reads.
 */
describe("design intent reaches the renderer", () => {
  it("stamps every layout axis onto the section wrapper", () => {
    for (const attribute of [
      "data-layout-bg",
      "data-layout-intent",
      "data-emphasis",
      "data-spacing",
    ]) {
      expect(renderer, `${attribute} is not stamped by PageRenderer`).toContain(
        attribute,
      );
    }
  });

  it("stamps page-level density and type scale on the page root", () => {
    expect(renderer).toContain("data-density");
    expect(renderer).toContain("data-type-scale");
  });

  it("leaves legacy sections unstamped so old pages render unchanged", () => {
    // A page saved before the plan existed has no `layout`. If the renderer
    // substituted a default, every legacy section would silently pick up
    // full_bleed's wider measure and a different vertical rhythm.
    expect(renderer).not.toContain("section.layout ?? DEFAULT_SECTION_LAYOUT");
    expect(renderer).toContain("data-layout-bg={layout?.background}");
    expect(renderer).toContain("data-density={page.design?.density}");
  });

  it("styles every background value the planner can emit", () => {
    // `image` is deliberately unstyled: the component owns its media backdrop.
    const styled = optionsOf("background").filter((value) => value !== "image");
    const missing = styled.filter(
      (value) => !layoutCss.includes(`[data-layout-bg="${value}"]`),
    );
    expect(missing).toEqual([]);
  });

  it("styles every spacing value the planner can emit", () => {
    const missing = optionsOf("spacing").filter(
      (value) => !layoutCss.includes(`[data-spacing="${value}"]`),
    );
    expect(missing).toEqual([]);
  });

  it("styles every density and type scale value", () => {
    const densityMissing = designDensitySchema.options.filter(
      (value) => !layoutCss.includes(`[data-density="${value}"]`),
    );
    const scaleMissing = designTypeScaleSchema.options.filter(
      (value) => !layoutCss.includes(`[data-type-scale="${value}"]`),
    );
    expect(densityMissing).toEqual([]);
    expect(scaleMissing).toEqual([]);
  });

  it("keeps the section padding and measure tokens variable-driven", () => {
    const tokenFiles = [
      "premium/shared/premiumTokens.ts",
      "elegant/shared/elegantTokens.ts",
      "minimal/shared/minimalTokens.ts",
      "rustic/shared/rusticTokens.ts",
      "vibrant/shared/vibrantTokens.ts",
      "bold/shared/boldTokens.ts",
    ];
    for (const file of tokenFiles) {
      const source = readFileSync(join(FRONTEND, "components", file), "utf8");
      expect(source, `${file} sectionPad is hardcoded`).toContain("var(--sec-pad-y");
      expect(source, `${file} headings do not scale`).toContain("var(--sec-type-scale");
    }
  });

  it("has no component left on a hardcoded container width", () => {
    // The measure is how density and intent change composition width; a
    // hardcoded max-w-6xl opts that component out silently.
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const hits = execSync(
      `grep -rl "max-w-6xl" --include="*.tsx" ${FRONTEND}/components ${FRONTEND}/render || true`,
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });
});
