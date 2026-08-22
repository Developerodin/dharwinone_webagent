/**
 * Generation-quality benchmark.
 *
 *   npx tsx scripts/benchmark.ts --label baseline
 *   npx tsx scripts/benchmark.ts --label phase1 --compare baseline
 *   npx tsx scripts/benchmark.ts --label live --live      (spends OpenAI tokens)
 *
 * Writes benchmarks/out/<label>/ : one page JSON per case, report.json, report.md.
 * Page JSON files are renderable — paste one into the preview to see the site.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BENCHMARK_CASES } from "../benchmarks/cases.js";
import {
  aggregate,
  measureCase,
  type AggregateMetrics,
  type CaseMetrics,
} from "../benchmarks/metrics.js";
import { runPipeline } from "../src/pipeline/runPipeline.js";
import { getSpec } from "../src/catalog/index.js";
import { InMemoryDiversityLedger } from "../src/pipeline/diversityLedger.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(HERE, "../benchmarks/out");

type Args = {
  label: string;
  compare: string | null;
  live: boolean;
  /** Disables cross-build memory, to measure what the ledger contributes. */
  noLedger: boolean;
};

/**
 * Reads --label / --compare / --live from argv.
 */
function parseArgs(argv: string[]): Args {
  const read = (flag: string): string | null => {
    const index = argv.indexOf(flag);
    return index >= 0 ? (argv[index + 1] ?? null) : null;
  };
  return {
    label: read("--label") ?? "local",
    compare: read("--compare"),
    live: argv.includes("--live"),
    noLedger: argv.includes("--no-ledger"),
  };
}

/**
 * Formats a ratio as a percentage string with one decimal.
 */
function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Renders the human-readable report for one run, with an optional baseline diff.
 */
function renderMarkdown(
  label: string,
  cases: CaseMetrics[],
  totals: AggregateMetrics,
  baseline: { label: string; totals: AggregateMetrics } | null,
): string {
  const lines: string[] = [];
  lines.push(`# Generation benchmark — \`${label}\``);
  lines.push("");
  lines.push(`Cases: ${totals.cases} · generated ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Scorecard");
  lines.push("");
  const header = baseline
    ? `| Metric | ${label} | ${baseline.label} | Target |`
    : `| Metric | ${label} | Target |`;
  const rule = baseline ? "|---|---|---|---|" : "|---|---|---|";
  lines.push(header, rule);

  const rows: Array<[string, string, string, string]> = [
    ["Cross-build component reuse", pct(totals.crossBuildComponentReuse),
      baseline ? (baseline.totals.crossBuildComponentReuse === undefined ? "n/a" : pct(baseline.totals.crossBuildComponentReuse)) : "", "lower is better"],
    ["Distinct home compositions", `${totals.distinctCompositions} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctCompositions ?? "n/a"} / ${baseline.totals.cases}` : "", "≥ 5 / 7"],
    ["Selections influenced by ledger", `${totals.diversityInfluenced}`,
      baseline ? `${baseline.totals.diversityInfluenced ?? "n/a"}` : "", "informational"],
    ["Catalog-driven selections", `${pct(totals.catalogShare)}`,
      baseline ? (baseline.totals.catalogShare === undefined ? "n/a" : pct(baseline.totals.catalogShare)) : "", "> 0%"],
    ["Section type mismatches", `${totals.sectionTypeMismatches}`,
      baseline ? `${baseline.totals.sectionTypeMismatches ?? "n/a"}` : "", "0"],
    ["Media contract breaches", `${totals.mediaContractBreaches}`,
      baseline ? `${baseline.totals.mediaContractBreaches ?? "n/a"}` : "", "0"],
    ["Compatibility penalties applied", `${totals.compatibilityPenalties}`,
      baseline ? `${baseline.totals.compatibilityPenalties ?? "n/a"}` : "", "informational"],
    ["Page structure correct", `${totals.pageStructureCorrect} / ${totals.cases}`,
      baseline ? `${baseline.totals.pageStructureCorrect ?? 0} / ${baseline.totals.cases}` : "", `${totals.cases} / ${totals.cases}`],
    ["Multi-page sites", `${totals.multiPageCases}`,
      baseline ? `${baseline.totals.multiPageCases ?? 0}` : "", "1"],
    ["Distinct section orders", `${totals.distinctSectionOrders} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctSectionOrders} / ${baseline.totals.cases}` : "", "≥ 6 / 7"],
    ["Distinct layout signatures", `${totals.distinctLayoutSignatures} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctLayoutSignatures} / ${baseline.totals.cases}` : "", "≥ 5 / 7"],
    ["Distinct surface rhythms", `${totals.distinctSurfaceSignatures} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctSurfaceSignatures} / ${baseline.totals.cases}` : "", "≥ 5 / 7"],
    ["Distinct spacing rhythms", `${totals.distinctSpacingSignatures} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctSpacingSignatures} / ${baseline.totals.cases}` : "", "≥ 4 / 7"],
    ["Distinct families", `${totals.distinctFamilies}`,
      baseline ? `${baseline.totals.distinctFamilies}` : "", "≥ 3"],
    ["Distinct accents", `${totals.distinctAccents} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctAccents} / ${baseline.totals.cases}` : "", "≥ 6 / 7"],
    ["Distinct display fonts", `${totals.distinctFontDisplay} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctFontDisplay} / ${baseline.totals.cases}` : "", "≥ 4 / 7"],
    ["Distinct hero images", `${totals.distinctHeroImages} / ${totals.cases}`,
      baseline ? `${baseline.totals.distinctHeroImages} / ${baseline.totals.cases}` : "", "≥ 6 / 7"],
    ["Image reuse rate", pct(totals.imageReuseRate),
      baseline ? pct(baseline.totals.imageReuseRate) : "", "< 10%"],
    ["Mean pairwise text Jaccard", totals.meanPairwiseJaccard.toFixed(3),
      baseline ? baseline.totals.meanPairwiseJaccard.toFixed(3) : "", "< 0.30"],
    ["CTA contrast passing AA", pct(totals.ctaContrastPassRate),
      baseline ? pct(baseline.totals.ctaContrastPassRate) : "", "100%"],
    ["Duplicate images on a page", `${totals.totalDuplicateImages}`,
      baseline ? `${baseline.totals.totalDuplicateImages}` : "", "0"],
  ];
  for (const [name, now, before, target] of rows) {
    lines.push(baseline ? `| ${name} | ${now} | ${before} | ${target} |` : `| ${name} | ${now} | ${target} |`);
  }
  lines.push("");

  lines.push("## Cases");
  for (const item of cases) {
    lines.push("");
    lines.push(`### ${item.label} — \`${item.id}\``);
    lines.push("");
    lines.push(`- **family** \`${item.family}\` · **archetype** \`${item.archetype ?? "—"}\` · **sections** ${item.sectionCount}`);
    lines.push(
      `- **site** \`${item.siteKind}\` · pages \`${item.pageRoles.join(", ")}\` ${item.pageStructureOk ? "OK" : "**MISMATCH**"}`,
    );
    lines.push(
      `- **selection** ${item.catalogSelections} catalog / ${item.legacySelections} legacy · mismatches ${item.sectionTypeMismatches} · media breaches ${item.mediaContractBreaches}`,
    );
    lines.push(`- **order** \`${item.sectionOrder}\``);
    lines.push(`- **components** \`${item.componentIds.join(", ")}\``);
    lines.push(`- **layout** \`${item.layoutSignature}\``);
    lines.push(`- **surface** \`${item.surfaceSignature}\``);
    lines.push(`- **spacing** \`${item.spacingSignature}\``);
    lines.push(`- **emphasis** \`${item.emphasisSignature}\``);
    lines.push(
      `- **palette** accent \`${item.accent ?? "—"}\` · bg \`${item.bg ?? "—"}\` · ink \`${item.ink ?? "—"}\``,
    );
    lines.push(`- **type** display \`${item.fontDisplay ?? "(family default)"}\` · body \`${item.fontBody ?? "(family default)"}\``);
    const ratio = item.ctaContrast === null ? "—" : item.ctaContrast.toFixed(2);
    lines.push(`- **CTA contrast** ${ratio} ${item.ctaContrastPasses ? "PASS" : "**FAIL**"}`);
    lines.push(`- **images** ${item.imagePaths.length} (${new Set(item.imagePaths).size} unique, ${item.duplicateImages} duplicated)`);
    if (item.longestCopy) {
      lines.push(
        `- **longest constrained copy** \`${item.longestCopy.field}\` ${item.longestCopy.chars} chars — “${item.longestCopy.text}”`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Runs every benchmark case and writes the run directory.
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.live) process.env.USE_FIXTURE_BRIEF = "true";
  process.env.PIPELINE_STAGE_DELAY = "0";

  const outDir = join(OUT_ROOT, args.label);
  mkdirSync(outDir, { recursive: true });

  // One ledger across the run, so later cases see what earlier ones shipped.
  const ledger = args.noLedger ? undefined : new InMemoryDiversityLedger();
  const measured: CaseMetrics[] = [];

  for (const testCase of BENCHMARK_CASES) {
    const result = await runPipeline({
      chatText: testCase.prompt,
      brief: testCase.brief,
      useFixture: !args.live,
      ledger,
    });

    writeFileSync(
      join(outDir, `${testCase.id}.page.json`),
      `${JSON.stringify(
        {
          case: testCase.id,
          prompt: testCase.prompt,
          expectedPages: testCase.expectedPages,
          family: result.family,
          direction: result.direction,
          droppedSections: result.droppedSections,
          page: result.page,
          pages: result.pages,
        },
        null,
        2,
      )}\n`,
    );

    measured.push(
      measureCase({
        id: testCase.id,
        label: testCase.label,
        page: result.page,
        direction: result.direction,
        family: result.family,
        pages: result.pages,
        expectedPages: testCase.expectedPages,
        fingerprint: result.fingerprint,
        selection: result.selection,
        specFor: (componentId: string) => {
          const spec = getSpec(componentId);
          return spec ? { section: spec.section, media: spec.media } : null;
        },
      }),
    );
    process.stdout.write(
      `  ✓ ${testCase.id} — ${result.direction.archetype} · ${result.pages.length} page(s)\n`,
    );
  }

  const totals = aggregate(measured);

  let baseline: { label: string; totals: AggregateMetrics } | null = null;
  if (args.compare) {
    const path = join(OUT_ROOT, args.compare, "report.json");
    if (existsSync(path)) {
      const prior = JSON.parse(readFileSync(path, "utf8")) as {
        label: string;
        totals: AggregateMetrics;
      };
      baseline = { label: prior.label, totals: prior.totals };
    } else {
      process.stdout.write(`  ! no baseline at ${path}\n`);
    }
  }

  writeFileSync(
    join(outDir, "report.json"),
    `${JSON.stringify({ label: args.label, live: args.live, totals, cases: measured }, null, 2)}\n`,
  );
  const markdown = renderMarkdown(args.label, measured, totals, baseline);
  writeFileSync(join(outDir, "report.md"), markdown);

  process.stdout.write(`\n${markdown.split("## Cases")[0]}\n`);
  process.stdout.write(`Wrote ${outDir}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
