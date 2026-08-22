/**
 * Regenerates the Google Fonts <link> in every frontend HTML entry point from
 * the type pairs the design system can actually choose.
 *
 *   npx tsx scripts/sync-fonts.ts          write
 *   npx tsx scripts/sync-fonts.ts --check  fail if drifted (CI / preflight)
 *
 * Without this the Creative Director can pick "Cormorant Garamond" and the
 * browser silently renders Georgia, which makes typography variety fictional.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requiredFontFamilies } from "../src/pipeline/horecaDesignSystem.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML_FILES = ["index.html", "preview.html", "gallery.html"].map((name) =>
  join(HERE, "../../frontend", name),
);

const START = "<!-- fonts:start -->";
const END = "<!-- fonts:end -->";

/** Weight axis requested per family. Display faces need the wide ramp. */
const AXIS = "wght@300;400;500;600;700";

/**
 * Builds the Google Fonts href covering every catalog family.
 */
export function buildFontHref(families: readonly string[]): string {
  const params = [...families]
    .sort((a, b) => a.localeCompare(b))
    .map((family) => `family=${family.replace(/ /g, "+")}:${AXIS}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Renders the managed block that replaces the hand-maintained <link>.
 */
function buildBlock(href: string): string {
  return [
    START,
    '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
    '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    `    <link href="${href}" rel="stylesheet" />`,
    `    ${END}`,
  ].join("\n    ");
}

/**
 * Replaces the managed block, or the legacy hand-written font links.
 */
function applyBlock(html: string, block: string): string {
  if (html.includes(START) && html.includes(END)) {
    const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
    return html.replace(pattern, block.trim());
  }
  const legacy =
    /\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[\s\S]*?rel="stylesheet"\s*\/>/;
  if (legacy.test(html)) {
    return html.replace(legacy, `\n    ${block.trim()}`);
  }
  return html.replace("</head>", `  ${block.trim()}\n  </head>`);
}

/**
 * Writes or verifies the font block across the HTML entry points.
 */
function main(): void {
  const check = process.argv.includes("--check");
  const families = requiredFontFamilies();
  const href = buildFontHref(families);
  const block = buildBlock(href);

  let drifted = false;
  for (const file of HTML_FILES) {
    const html = readFileSync(file, "utf8");
    const next = applyBlock(html, block);
    if (next === html) {
      process.stdout.write(`  = ${file.split("/").pop()}\n`);
      continue;
    }
    drifted = true;
    if (check) {
      process.stdout.write(`  ! ${file.split("/").pop()} is out of date\n`);
      continue;
    }
    writeFileSync(file, next);
    process.stdout.write(`  ✓ ${file.split("/").pop()}\n`);
  }

  process.stdout.write(`\n${families.length} font families from the design system\n`);
  if (check && drifted) {
    process.stderr.write("Font links drifted — run: npx tsx scripts/sync-fonts.ts\n");
    process.exit(1);
  }
}

main();
