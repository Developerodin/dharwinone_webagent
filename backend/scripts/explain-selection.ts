/**
 * Prints why each component was chosen for a benchmark case.
 *
 *   npm run explain -- modern-cafe
 *   npm run explain -- luxury-restaurant --scores
 *
 * Development observability only — never shown to end users.
 */
import { BENCHMARK_CASES } from "../benchmarks/cases.js";
import { runPipeline } from "../src/pipeline/runPipeline.js";
import { InMemoryDiversityLedger } from "../src/pipeline/diversityLedger.js";

process.env.USE_FIXTURE_BRIEF = "true";
process.env.PIPELINE_STAGE_DELAY = "0";

/**
 * Renders one score table.
 */
function printScores(
  scores: NonNullable<
    Awaited<ReturnType<typeof runPipeline>>["selection"][number]["scores"]
  >,
): void {
  for (const entry of scores) {
    process.stdout.write(`      ${entry.id}\n`);
    for (const term of entry.terms) {
      if (term.delta === 0) continue;
      const delta = `${term.delta > 0 ? "+" : ""}${term.delta}`;
      const marker = term.name.startsWith("diversity") ? " *" : "  ";
      process.stdout.write(
        `       ${marker}${term.name.padEnd(20)} ${delta.padStart(6)}  ${term.why}\n`,
      );
    }
    process.stdout.write(
      `         ${"final".padEnd(20)} ${String(entry.total).padStart(6)}\n`,
    );
  }
}

/**
 * Runs one case and prints its selection trace.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wanted = args.find((arg) => !arg.startsWith("--"));
  const withScores = args.includes("--scores");

  const cases = wanted
    ? BENCHMARK_CASES.filter((item) => item.id === wanted)
    : BENCHMARK_CASES;

  // Running the whole suite through one ledger is what makes cross-build
  // pressure visible: later cases see what earlier ones already used.
  const ledger = new InMemoryDiversityLedger();

  if (cases.length === 0) {
    process.stderr.write(
      `Unknown case "${wanted}". Available: ${BENCHMARK_CASES.map((c) => c.id).join(", ")}\n`,
    );
    process.exit(1);
  }

  for (const testCase of cases) {
    const result = await runPipeline({
      chatText: testCase.prompt,
      brief: testCase.brief,
      useFixture: true,
      ledger,
    });

    process.stdout.write(
      `\n${testCase.label}  —  family ${result.family} · archetype ${result.direction.archetype} · ${result.direction.sitePlan?.kind}\n`,
    );
    process.stdout.write(`${"─".repeat(96)}\n`);

    let page = "";
    for (const trace of result.selection) {
      if (trace.page !== page) {
        page = trace.page;
        process.stdout.write(`  ${page}\n`);
      }
      process.stdout.write(
        `    ${trace.section.padEnd(14)} [${trace.source.padEnd(7)}] ${trace.explain}\n`,
      );
      if (withScores && trace.scores) printScores(trace.scores);
    }

    const fromCatalog = result.selection.filter((t) => t.source === "catalog");
    const diversityHits = result.selection.filter((trace) =>
      trace.scores?.[0]?.terms.some((term) => term.name.startsWith("diversity")),
    ).length;
    process.stdout.write(
      `  catalog ${fromCatalog.length}/${result.selection.length} selections · `
        + `diversity influenced ${diversityHits} · cohort ${result.fingerprint.cohort}\n`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
