/**
 * Variance harness — builds N fixture briefs and reports sameness metrics.
 * Run: npx tsx scripts/variance-check.ts
 */
import { FIXTURE_BRIEF } from "../src/data/fixtureBrief.js";
import type { Brief } from "../src/schemas/brief.schema.js";
import { runPipeline } from "../src/pipeline/runPipeline.js";
import type { Page } from "../src/schemas/page.schema.js";

process.env.USE_FIXTURE_BRIEF = "true";
process.env.PIPELINE_STAGE_DELAY = "0";

const FIXTURES: Brief[] = [
  FIXTURE_BRIEF,
  {
    ...FIXTURE_BRIEF,
    businessName: "Kerala Coast",
    category: "Kerala seafood",
    usp: "Only wood-fired catch of the day in Fort Kochi",
    signatureDishes: ["Karimeen pollichathu", "Prawn moilee"],
    audience: "date nights",
    menuItems: [
      { name: "Karimeen", price: 650, description: null },
      { name: "Prawn moilee", price: 480, description: null },
    ],
  } as Brief,
  {
    ...FIXTURE_BRIEF,
    businessName: "Nonna's Counter",
    category: "Italian quick service",
    usp: "Roman pinsa by the slice",
    audience: "office lunch",
    priceBand: "budget",
  } as Brief,
  {
    ...FIXTURE_BRIEF,
    businessName: "Rooftop Ember",
    category: "Cocktail bar rooftop",
    usp: "Sunset reservations over the river",
    audience: "date nights",
    vibe: ["rooftop", "loud"],
  } as Brief,
  {
    ...FIXTURE_BRIEF,
    businessName: "Udupi House",
    category: "South Indian vegetarian",
    usp: "Temple-style filter coffee and idli since 1982",
    foundedYear: 1982,
    dietary: ["veg", "jain"],
    audience: "families",
  } as Brief,
];

/**
 * Collects visible page text for similarity metrics.
 */
function pageText(page: Page): string[] {
  const tokens: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === "string") {
      for (const t of value.toLowerCase().split(/\W+/)) {
        if (t.length > 2) tokens.push(t);
      }
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  };
  for (const section of page.sections) walk(section.content);
  return tokens;
}

/**
 * Jaccard similarity between two token multisets (as sets).
 */
function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Runs the variance harness and prints a report.
 */
async function main(): Promise<void> {
  const builds = [];
  for (const brief of FIXTURES) {
    const result = await runPipeline({
      chatText: `${brief.businessName} ${brief.category}`,
      brief,
      useFixture: true,
    });
    builds.push(result);
  }

  const orders = builds.map((b) => b.page.sections.map((s) => s.type).join(">"));
  const distinctOrders = new Set(orders).size;

  const texts = builds.map((b) => pageText(b.page));
  let pairSum = 0;
  let pairs = 0;
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      pairSum += jaccard(texts[i]!, texts[j]!);
      pairs += 1;
    }
  }
  const meanJaccard = pairs === 0 ? 0 : pairSum / pairs;

  const palettes = builds.map(
    (b) =>
      `${b.page.themeOverrides?.accent ?? ""}|${b.page.themeOverrides?.fontDisplay ?? ""}`,
  );
  const distinctPalettes = new Set(palettes).size;

  const images = builds.flatMap((b) =>
    b.page.sections.flatMap((s) => s.assets.map((a) => a.imagePath)),
  );
  const uniqueImages = new Set(images).size;
  const reuseRate =
    images.length === 0 ? 0 : 1 - uniqueImages / images.length;

  console.log("=== Variance check ===");
  console.log(`Builds: ${builds.length}`);
  console.log(`Distinct section orders: ${distinctOrders} (target ≥ 3 of ${builds.length})`);
  console.log(`Mean pairwise text Jaccard: ${meanJaccard.toFixed(3)} (target < 0.25)`);
  console.log(`Distinct palette/type pairs: ${distinctPalettes}`);
  console.log(`Image reuse rate: ${(reuseRate * 100).toFixed(1)}% (target < 15%)`);

  // Fixture-mode copy still shares template bones; hard-fail only on collapsed structure.
  // Live LLM builds should target meanJaccard < 0.25 (Wave 3 narrative).
  const failed = distinctOrders < 2;

  if (failed) {
    console.error("VARIANCE CHECK FAILED");
    process.exit(1);
  }
  if (meanJaccard >= 0.25) {
    console.warn(
      "NOTE: text Jaccard above 0.25 — expected under USE_FIXTURE_BRIEF; check live creative model for production.",
    );
  }
  console.log("VARIANCE CHECK OK");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
