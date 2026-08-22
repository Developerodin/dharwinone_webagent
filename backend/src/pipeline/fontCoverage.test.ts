import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  fontStackFor,
  listDistinctiveTypePairs,
  pickTypePairForSeed,
  requiredFontFamilies,
} from "./horecaDesignSystem.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML_FILES = ["index.html", "preview.html", "gallery.html"];

/**
 * Reads a frontend HTML entry point.
 */
function readHtml(name: string): string {
  return readFileSync(join(HERE, "../../../frontend", name), "utf8");
}

describe("font coverage", () => {
  it.each(HTML_FILES)("loads every design-system font family in %s", (name) => {
    const html = readHtml(name);
    const missing = requiredFontFamilies().filter(
      (family) => !html.includes(family.replace(/ /g, "+")),
    );
    expect(missing).toEqual([]);
  });

  it("emits a font stack whose first family is loaded", () => {
    const html = readHtml("index.html");
    for (const pair of listDistinctiveTypePairs()) {
      for (const face of [pair.headingFont, pair.bodyFont]) {
        const stack = fontStackFor(face);
        expect(stack).toBeTruthy();
        const first = stack!.split(",")[0]!.replace(/"/g, "").trim();
        expect(
          html.includes(first.replace(/ /g, "+")),
          `${first} is selectable but not loaded`,
        ).toBe(true);
      }
    }
  });

  it("always resolves a type pair for any seed", () => {
    for (const seed of ["a|cafe", "b|bakery", "c|fine dining", "d|", "e|bbq"]) {
      const pair = pickTypePairForSeed(seed, "restaurant", "");
      expect(pair).not.toBeNull();
      expect(fontStackFor(pair!.headingFont)).toBeTruthy();
    }
  });

  it("spreads type pairs across different businesses", () => {
    const seeds = [
      "rowan|modern cafe", "verre|fine dining", "lucia|trattoria",
      "mori|kaiseki", "flour|bakery", "grind|coffee", "harbour|seafood",
    ];
    const chosen = new Set(
      seeds.map((seed) => pickTypePairForSeed(seed, seed.split("|")[1], "")?.id),
    );
    expect(chosen.size).toBeGreaterThanOrEqual(3);
  });
});

describe("type pairing matches the business", () => {
  /** Launch-vertical briefs and the mood the catalog should land on. */
  const EXPECTATIONS: Array<{ seed: string; category: string; expectMood: RegExp }> = [
    { seed: "rowan", category: "Modern cafe", expectMood: /caf|minimal|crisp|craft/i },
    { seed: "grind", category: "Neighbourhood coffee shop", expectMood: /caf|minimal|crisp|craft/i },
    { seed: "flour", category: "Artisan sourdough bakery", expectMood: /bakery|artisan|homely|patisserie/i },
    { seed: "mori", category: "Japanese kaiseki fine dining", expectMood: /japanese|zen|fine dining/i },
    { seed: "verre", category: "Luxury contemporary French", expectMood: /french|fine dining|luxury|european/i },
    { seed: "lucia", category: "Casual Italian trattoria", expectMood: /italian|trattoria/i },
    { seed: "harbour", category: "Coastal seafood restaurant", expectMood: /seafood|coastal/i },
    { seed: "smoke", category: "Barbecue smokehouse", expectMood: /bbq|smokehouse|steakhouse/i },
  ];

  it.each(EXPECTATIONS)(
    "matches $category to an appropriate type pair",
    ({ seed, category, expectMood }) => {
      const pair = pickTypePairForSeed(`${seed}|${category}`, category, "");
      expect(pair).not.toBeNull();
      expect(pair!.mood, `${category} → ${pair!.id} (${pair!.mood})`).toMatch(
        expectMood,
      );
    },
  );

  it("does not let the seed override a real category match", () => {
    // Same business, many seeds — the mood match must hold across all of them.
    const moods = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (salt) =>
          pickTypePairForSeed(`${salt}|bakery`, "Artisan sourdough bakery", "")!
            .mood,
      ),
    );
    for (const mood of moods) {
      expect(mood).toMatch(/bakery|artisan|homely|patisserie/i);
    }
  });
});
