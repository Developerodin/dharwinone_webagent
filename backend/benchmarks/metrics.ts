import { contrastRatio } from "../src/pipeline/colorResolve.js";
import type { CreativeDirection } from "../src/schemas/creativeDirection.schema.js";
import type { Page } from "../src/schemas/page.schema.js";

/** WCAG AA floor for normal-size body and control text. */
export const AA_NORMAL = 4.5;

export type CaseMetrics = {
  id: string;
  label: string;
  family: string;
  archetype: string | null;
  siteKind: string;
  /** Page roles the planner produced, home first. */
  pageRoles: string[];
  pagePaths: string[];
  expectedPages: string[];
  pageStructureOk: boolean;
  /** Sections resolved through the component catalog vs legacy suffix scoring. */
  catalogSelections: number;
  legacySelections: number;
  /** Selections whose spec section disagreed with the slot it filled. */
  sectionTypeMismatches: number;
  /** Sections whose image count broke the component's media contract. */
  mediaContractBreaches: number;
  /** Adjacency or repetition penalties that fired during ranking. */
  compatibilityPenalties: number;
  /** Section types in render order, joined — the page's structural signature. */
  sectionOrder: string;
  componentIds: string[];
  sectionCount: number;
  /** layoutIntent per section, joined — how varied the composition plan is. */
  layoutSignature: string;
  /** background per section, joined — the surface rhythm. */
  surfaceSignature: string;
  spacingSignature: string;
  emphasisSignature: string;
  accent: string | null;
  bg: string | null;
  ink: string | null;
  fontDisplay: string | null;
  fontBody: string | null;
  /** Contrast of CTA label on the accent surface, as the page will render it. */
  ctaContrast: number | null;
  ctaContrastPasses: boolean;
  imagePaths: string[];
  duplicateImages: number;
  /** Longest value per copy field, for spotting layout-breaking content. */
  longestCopy: { field: string; chars: number; text: string } | null;
  copyTokens: string[];
};

export type AggregateMetrics = {
  cases: number;
  /** Cases whose page count matched what the prompt asked for. */
  pageStructureCorrect: number;
  multiPageCases: number;
  singlePageCases: number;
  catalogSelections: number;
  legacySelections: number;
  catalogShare: number;
  sectionTypeMismatches: number;
  mediaContractBreaches: number;
  compatibilityPenalties: number;
  distinctSectionOrders: number;
  distinctLayoutSignatures: number;
  distinctSurfaceSignatures: number;
  distinctSpacingSignatures: number;
  distinctFamilies: number;
  distinctAccents: number;
  distinctFontDisplay: number;
  distinctHeroImages: number;
  imageReuseRate: number;
  meanPairwiseJaccard: number;
  ctaContrastPassRate: number;
  totalDuplicateImages: number;
};

/**
 * Reads a themeOverrides key as a string, or null when unset.
 */
function token(page: Page, key: string): string | null {
  const value = (page.themeOverrides as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Collects every string leaf under a section's content for text-similarity work.
 */
function copyStrings(value: unknown, out: Array<{ path: string; text: string }>, path = ""): void {
  if (typeof value === "string") {
    if (value.trim()) out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => copyStrings(item, out, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      copyStrings(child, out, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * Lowercase word tokens over all visible copy, for pairwise similarity.
 */
export function pageTextTokens(page: Page): string[] {
  const found: Array<{ path: string; text: string }> = [];
  for (const section of page.sections) copyStrings(section.content, found, section.type);
  const tokens: string[] = [];
  for (const { text } of found) {
    for (const word of text.toLowerCase().split(/\W+/)) {
      if (word.length > 2) tokens.push(word);
    }
  }
  return tokens;
}

/**
 * Jaccard similarity over unique tokens. 0 = nothing shared, 1 = identical sets.
 */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}

/**
 * Copy fields that render inside a constrained control or single line.
 */
const TIGHT_FIELDS = new Set(["ctaLabel", "eyebrow", "tagline", "headline", "sectionTitle"]);

/**
 * Extracts the comparison metrics for one generated page.
 */
export function measureCase(args: {
  id: string;
  label: string;
  page: Page;
  direction: CreativeDirection;
  family: string;
  pages: ReadonlyArray<{ role: string; path: string; page: Page }>;
  expectedPages: readonly string[];
  fingerprint: { cohort: string; compositionSignature: string; components: string[] };
  selection: ReadonlyArray<{
    source: string;
    section: string;
    chosen: string;
    scores?: Array<{ id: string; total: number; terms: Array<{ name: string; delta: number }> }>;
  }>;
  specFor: (componentId: string) => {
    section: string;
    media: { min: number; max: number };
  } | null;
}): CaseMetrics {
  const { page, direction } = args;
  const sections = page.sections;

  const imagePaths = sections.flatMap((section) =>
    section.assets.map((asset) => asset.imagePath),
  );
  const duplicateImages = imagePaths.length - new Set(imagePaths).size;

  const accent = token(page, "accent");
  const accentContrast = token(page, "accentContrast");
  const ctaContrast =
    accent && accentContrast ? contrastRatio(accent, accentContrast) : null;

  const copy: Array<{ path: string; text: string }> = [];
  for (const section of sections) copyStrings(section.content, copy, section.type);
  const tight = copy.filter((item) => {
    const leaf = item.path.split(".").pop() ?? "";
    return TIGHT_FIELDS.has(leaf);
  });
  const longest = tight.sort((a, b) => b.text.length - a.text.length)[0] ?? null;

  const pageRoles = args.pages.map((entry) => entry.role);
  const expected = [...args.expectedPages];
  // A single-page request is correct when it produced exactly one page; a
  // multi-page request is correct when every requested page exists.
  const pageStructureOk =
    expected.length <= 1
      ? pageRoles.length === 1
      : expected.every((role) => pageRoles.includes(role));

  let sectionTypeMismatches = 0;
  let mediaContractBreaches = 0;
  for (const generated of args.pages) {
    for (const section of generated.page.sections) {
      const spec = args.specFor(section.componentId);
      if (!spec) continue;
      if (spec.section !== section.type) sectionTypeMismatches += 1;
      const count = section.assets.length;
      if (count < spec.media.min || count > spec.media.max) {
        mediaContractBreaches += 1;
      }
    }
  }

  const diversityInfluenced = args.selection.filter((trace) =>
    trace.scores?.[0]?.terms.some((term) => term.name.startsWith("diversity")),
  ).length;

  const compatibilityPenalties = args.selection.reduce((sum, trace) => {
    const winner = trace.scores?.[0];
    if (!winner) return sum;
    return (
      sum +
      winner.terms.filter(
        (term) =>
          term.delta < 0 &&
          [
            "adjacencyConflict",
            "repetitionPenalty",
            "densityStackPenalty",
            "pageVarietyPenalty",
          ].includes(term.name),
      ).length
    );
  }, 0);

  return {
    id: args.id,
    label: args.label,
    family: args.family,
    archetype: direction.archetype ?? null,
    cohort: args.fingerprint.cohort,
    compositionSignature: args.fingerprint.compositionSignature,
    componentIds: args.fingerprint.components,
    catalogSelections: args.selection.filter((t) => t.source === "catalog").length,
    legacySelections: args.selection.filter((t) => t.source === "legacy").length,
    sectionTypeMismatches,
    mediaContractBreaches,
    compatibilityPenalties,
    diversityInfluenced,
    siteKind: direction.sitePlan?.kind ?? "single_page",
    pageRoles,
    pagePaths: args.pages.map((entry) => entry.path),
    expectedPages: expected,
    pageStructureOk,
    sectionOrder: sections.map((section) => section.type).join(">"),
    componentIds: sections.map((section) => section.componentId),
    sectionCount: sections.length,
    layoutSignature: sections.map((s) => s.layout?.intent ?? "-").join(">"),
    surfaceSignature: sections.map((s) => s.layout?.background ?? "-").join(">"),
    spacingSignature: sections.map((s) => s.layout?.spacing ?? "-").join(">"),
    emphasisSignature: sections.map((s) => s.layout?.emphasis ?? "-").join(">"),
    accent,
    bg: token(page, "bg"),
    ink: token(page, "ink"),
    fontDisplay: token(page, "fontDisplay"),
    fontBody: token(page, "fontBody"),
    ctaContrast,
    ctaContrastPasses: ctaContrast !== null && ctaContrast >= AA_NORMAL,
    imagePaths,
    duplicateImages,
    longestCopy: longest
      ? { field: longest.path, chars: longest.text.length, text: longest.text }
      : null,
    copyTokens: pageTextTokens(page),
  };
}

/**
 * Rolls per-case metrics up into the sameness / quality scorecard.
 */
export function aggregate(cases: CaseMetrics[]): AggregateMetrics {
  const distinct = (values: Array<string | null>): number =>
    new Set(values.filter((value): value is string => value !== null)).size;

  const allImages = cases.flatMap((item) => item.imagePaths);
  const imageReuseRate =
    allImages.length === 0 ? 0 : 1 - new Set(allImages).size / allImages.length;

  let pairSum = 0;
  let pairs = 0;
  for (let i = 0; i < cases.length; i += 1) {
    for (let j = i + 1; j < cases.length; j += 1) {
      pairSum += jaccard(cases[i]!.copyTokens, cases[j]!.copyTokens);
      pairs += 1;
    }
  }

  const withContrast = cases.filter((item) => item.ctaContrast !== null);

  return {
    cases: cases.length,
    pageStructureCorrect: cases.filter((item) => item.pageStructureOk).length,
    multiPageCases: cases.filter((item) => item.pageRoles.length > 1).length,
    singlePageCases: cases.filter((item) => item.pageRoles.length === 1).length,
    catalogSelections: cases.reduce((n, c) => n + c.catalogSelections, 0),
    legacySelections: cases.reduce((n, c) => n + c.legacySelections, 0),
    catalogShare:
      cases.reduce((n, c) => n + c.catalogSelections + c.legacySelections, 0) === 0
        ? 0
        : cases.reduce((n, c) => n + c.catalogSelections, 0) /
          cases.reduce((n, c) => n + c.catalogSelections + c.legacySelections, 0),
    sectionTypeMismatches: cases.reduce((n, c) => n + c.sectionTypeMismatches, 0),
    mediaContractBreaches: cases.reduce((n, c) => n + c.mediaContractBreaches, 0),
    compatibilityPenalties: cases.reduce((n, c) => n + c.compatibilityPenalties, 0),
    crossBuildComponentReuse: crossBuildReuse(cases),
    distinctCompositions: new Set(cases.map((c) => c.compositionSignature)).size,
    diversityInfluenced: cases.reduce((n, c) => n + c.diversityInfluenced, 0),
    distinctSectionOrders: distinct(cases.map((item) => item.sectionOrder)),
    distinctLayoutSignatures: distinct(cases.map((item) => item.layoutSignature)),
    distinctSurfaceSignatures: distinct(cases.map((item) => item.surfaceSignature)),
    distinctSpacingSignatures: distinct(cases.map((item) => item.spacingSignature)),
    distinctFamilies: distinct(cases.map((item) => item.family)),
    distinctAccents: distinct(cases.map((item) => item.accent)),
    distinctFontDisplay: distinct(cases.map((item) => item.fontDisplay)),
    distinctHeroImages: distinct(cases.map((item) => item.imagePaths[0] ?? null)),
    imageReuseRate,
    meanPairwiseJaccard: pairs === 0 ? 0 : pairSum / pairs,
    ctaContrastPassRate:
      withContrast.length === 0
        ? 0
        : withContrast.filter((item) => item.ctaContrastPasses).length /
          withContrast.length,
    totalDuplicateImages: cases.reduce((sum, item) => sum + item.duplicateImages, 0),
  };
}

/**
 * How much each build repeats from earlier builds in the same cohort.
 *
 * Measured only within a cohort: a bakery repeating a fine-dining room's
 * components is not repetition anyone would notice.
 */
function crossBuildReuse(cases: CaseMetrics[]): number {
  const seen = new Map<string, Set<string>>();
  const rates: number[] = [];

  for (const item of cases) {
    const previous = seen.get(item.cohort);
    if (previous && previous.size > 0 && item.componentIds.length > 0) {
      const repeated = item.componentIds.filter((id) => previous.has(id));
      rates.push(repeated.length / item.componentIds.length);
    }
    const set = seen.get(item.cohort) ?? new Set<string>();
    for (const id of item.componentIds) set.add(id);
    seen.set(item.cohort, set);
  }

  return rates.length === 0
    ? 0
    : rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}
