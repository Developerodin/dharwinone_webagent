import { describe, expect, it } from "vitest";
import { contrastForAccent, contrastRatio } from "./colorResolve.js";
import { getHorecaDesignSystem } from "./horecaDesignSystem.js";
import { inventPalette } from "./paletteDefaults.js";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";

/** WCAG AA floor for control labels at normal weight. */
const AA = 4.5;

/**
 * Every colour role the design system can put text on top of.
 */
function catalogAccents(): Array<{ id: string; hex: string }> {
  const system = getHorecaDesignSystem();
  const out: Array<{ id: string; hex: string }> = [];
  for (const palette of system.palettes) {
    out.push({ id: `${palette.id}.primary`, hex: palette.primary });
    out.push({ id: `${palette.id}.secondary`, hex: palette.secondary });
    out.push({ id: `${palette.id}.accent`, hex: palette.accent });
  }
  return out;
}

/** Category cues that route through every curated palette bucket. */
const CATEGORY_PROBES = [
  "Italian trattoria",
  "Japanese omakase",
  "Barbecue smokehouse",
  "Modern cafe",
  "Fine dining French",
  "Tex-Mex cantina",
  "North Indian tandoor",
  "Vegan salad bar",
  "Coastal seafood",
  "Neighbourhood coffee shop",
  "Artisan bakery",
];

describe("palette contrast", () => {
  it("gives every catalog accent a CTA label that passes AA", () => {
    const failures = catalogAccents()
      .map((entry) => ({
        ...entry,
        ink: contrastForAccent(entry.hex),
      }))
      .map((entry) => ({
        ...entry,
        ratio: contrastRatio(entry.hex, entry.ink),
      }))
      .filter((entry) => entry.ratio < AA);

    expect(
      failures.map((f) => `${f.id} ${f.hex} on ${f.ink} = ${f.ratio.toFixed(2)}`),
    ).toEqual([]);
  });

  it("gives every invented palette a CTA label that passes AA", () => {
    const failures: string[] = [];
    for (const category of CATEGORY_PROBES) {
      for (let variant = 0; variant < 6; variant += 1) {
        const brief: Brief = {
          ...FIXTURE_BRIEF,
          businessName: `Probe ${variant}`,
          category,
        };
        const seed = `${category}|${variant}`;
        const palette = inventPalette(brief, category, seed);
        const ratio = contrastRatio(palette.accent, palette.accentContrast);
        if (ratio < AA) {
          failures.push(
            `${category}#${variant} ${palette.accent} on ${palette.accentContrast} = ${ratio.toFixed(2)}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("always picks the higher-contrast ink of the two candidates", () => {
    for (const { hex } of catalogAccents()) {
      const chosen = contrastForAccent(hex);
      const other = chosen === "#ffffff" ? "#111111" : "#ffffff";
      expect(contrastRatio(hex, chosen)).toBeGreaterThanOrEqual(
        contrastRatio(hex, other),
      );
    }
  });
});
