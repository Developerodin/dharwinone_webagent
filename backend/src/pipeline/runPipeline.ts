import type { PageFamily } from "../config/pageFamily.js";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";
import type {
  CreativeDirection,
  PagePlanItem,
  SectionPlanItem,
} from "../schemas/creativeDirection.schema.js";
import type { Page, PageSection, SectionType } from "../schemas/page.schema.js";
import { assemblePage } from "./assemblePage.js";
import { hydrateLocationFacts } from "./applyLocationOp.js";
import {
  applyCreativePalette,
  runCreativeDirector,
} from "./creativeDirector.js";
import { extractBrief } from "./extractBrief.js";
import { factCheck } from "./factCheck.js";
import { getSpec, resolveCandidates } from "../catalog/index.js";
import {
  explainChoice,
  rankCandidates,
  type RankContext,
} from "./rankComponents.js";
import type { ComponentSpec, LayoutFamily } from "../schemas/componentSpec.schema.js";
import { themeOverridesForFamily } from "./horecaDesignSystem.js";
import {
  orientationForSection,
  pickGalleryImages,
  pickImage,
  pickSectionImages,
} from "./pickImage.js";
import { planSections } from "./planSections.js";
import { inferPageFamily } from "./inferPageFamily.js";
import { planSite } from "./planSite.js";
import {
  cohortKey,
  measurePressure,
  NULL_LEDGER,
  type BuildFingerprint,
  type DiversityLedger,
  type DiversityPressure,
} from "./diversityLedger.js";
import {
  buildSectionRhythm,
  surfaceProgramFor,
  surfaceProgramIds,
} from "./sectionRhythm.js";
import {
  createInitialStageLog,
  emitStage,
  type PipelineStageLog,
  type PipelineStageName,
  type StageCallback,
} from "./pipelineStages.js";
import {
  briefTeam,
  briefTestimonials,
  defaultServices,
  realStats,
} from "./sectionDefaults.js";
import { ensureStageFeel } from "./stageDelay.js";
import { verifyBriefAgainstSource } from "./verifyBrief.js";
import { writeCopy, writeCopyFixture } from "./writeCopy.js";

/**
 * Marks a stage done after padding elapsed time for multi-agent UX feel.
 */
async function completeStage(
  stages: PipelineStageLog[],
  name: PipelineStageName,
  onStage: StageCallback | undefined,
  startedAt: number,
): Promise<void> {
  const ms = await ensureStageFeel(name, startedAt);
  emitStage(stages, name, "done", onStage, ms);
}

export type PipelineInput = {
  chatText: string;
  useFixture?: boolean;
  /** Pre-confirmed brief from intake — skips extraction stage. */
  brief?: Brief;
  /** Component family override (premium | elegant | minimal | rustic | vibrant | bold). */
  family?: PageFamily;
  onStage?: StageCallback;
  /**
   * Cross-build memory. Omitted means no diversity pressure at all, which keeps
   * the pipeline a pure function of its inputs — the default for tests.
   */
  ledger?: DiversityLedger;
};

/** One generated page of the site. */
export type GeneratedPage = {
  role: string;
  title: string;
  path: string;
  page: Page;
};

export type PipelineResult = {
  /**
   * The home page. Kept as the primary field so every existing caller —
   * persistence, preview, edit — keeps working unchanged.
   */
  page: Page;
  /**
   * Every page of the site, home first. Single-page sites have one entry.
   */
  pages: GeneratedPage[];
  brief: Brief;
  family: PageFamily;
  droppedSections: SectionType[];
  stages: PipelineStageLog[];
  direction: CreativeDirection;
  /** Why each component was chosen. Development observability, not user-facing. */
  selection: SelectionTrace[];
  /** What this build contributed to cross-build memory. */
  fingerprint: BuildFingerprint;
};

type PlannedSection = {
  sectionType: SectionType;
  componentId: string;
  imagePath: string | null;
  /** User-uploaded photo paths to prefer over catalog images. */
  preferPaths?: string[];
  /** The catalog spec this section resolved to. */
  spec: ComponentSpec;
};

/** One line of the selection trace, for development observability. */
export type SelectionTrace = {
  page: string;
  section: SectionType;
  source: "catalog" | "legacy";
  chosen: string;
  candidates: number;
  /** Capability constraints that had to be relaxed, if any. */
  relaxed?: string[];
  explain: string;
  scores?: Array<{ id: string; total: number; terms: Array<{ name: string; delta: number; why: string }> }>;
};

/**
 * Builds section assets, preferring user-uploaded paths then catalog picks.
 * @param preferPaths - User-provided photo paths to use before catalog images.
 */
function buildAssets(args: {
  sectionType: SectionType;
  imagePath: string | null;
  family: PageFamily;
  spec: ComponentSpec;
  category?: string | null;
  seed?: string | null;
  usedPaths?: Set<string>;
  /** User-uploaded photo paths, preferred over the catalog. */
  preferPaths?: string[];
}): PageSection["assets"] {
  const { sectionType, imagePath, family, spec, category, seed, usedPaths, preferPaths } = args;
  // The component's own media contract decides how many images it gets.
  // Before the catalog existed this was hardcoded here as
  // `componentId.endsWith("-03")` and per-section-type constants.
  const wanted = spec.media.max;

  if (wanted === 0) return [];

  if (wanted === 1) {
    if (!imagePath) return [];
    return [{ key: "primary", imagePath }];
  }

  const keyPrefix =
    sectionType === "gallery" ? "gallery" : sectionType === "team" ? "team" : "slide";
  const pool = sectionType === "team" ? "team" : sectionType === "gallery" ? "gallery" : "hero";

  const paths = pickSectionImages(
    pool as SectionType,
    wanted,
    family,
    category,
    seed,
    usedPaths,
    sectionType === "team" ? undefined : preferPaths,
  );

  if (paths.length === 0) {
    return imagePath ? [{ key: `${keyPrefix}-0`, imagePath }] : [];
  }

  return paths.map((path, index) => ({
    key: `${keyPrefix}-${index}`,
    imagePath: path,
  }));
}

/**
 * Enriches section content with brief facts + default list blocks (not LLM).
 */
function enrichSectionContent(
  sectionType: SectionType,
  content: Record<string, unknown>,
  brief: Brief,
  presentSections: readonly SectionType[],
  chatText = "",
  sitePages?: readonly PagePlanItem[],
): Record<string, unknown> {
  if (sectionType === "menu") {
    return {
      ...content,
      items: brief.menuItems,
    };
  }

  if (sectionType === "location_map") {
    return hydrateLocationFacts(content, brief);
  }

  if (sectionType === "services") {
    return { ...content, items: defaultServices(brief, chatText) };
  }

  if (sectionType === "stats") {
    return { ...content, items: realStats(brief) };
  }

  if (sectionType === "testimonials") {
    return { ...content, items: briefTestimonials(brief) };
  }

  if (sectionType === "team") {
    return { ...content, members: briefTeam(brief) };
  }

  if (sectionType === "reservation") {
    return hydrateLocationFacts(content, brief);
  }

  if (sectionType === "header") {
    const tagline =
      typeof content.tagline === "string" && content.tagline.trim().length >= 6
        ? content.tagline
        : defaultHeaderTagline(brief);
    const ctaLabel =
      typeof content.ctaLabel === "string" && content.ctaLabel.trim()
        ? content.ctaLabel
        : "Reserve a Table";
    const eyebrow =
      typeof content.eyebrow === "string" && content.eyebrow.trim()
        ? content.eyebrow
        : brief.category;
    return {
      ...content,
      brandName:
        typeof content.brandName === "string" && content.brandName
          ? content.brandName
          : brief.businessName,
      tagline,
      ctaLabel,
      eyebrow,
      navItems: defaultNavItems(brief, presentSections, sitePages),
    };
  }

  if (sectionType === "contact") {
    return hydrateLocationFacts(content, brief);
  }

  if (sectionType === "footer") {
    return {
      ...hydrateLocationFacts(content, brief),
      brandName: brief.businessName,
      navItems: defaultNavItems(brief, presentSections, sitePages),
    };
  }

  return content;
}

/**
 * Builds in-page nav from sections that exist, with cuisine-aware menu labels.
 */
function defaultNavItems(
  brief: Brief,
  presentSections: readonly SectionType[],
  sitePages?: readonly PagePlanItem[],
): Array<{ label: string; target: SectionType; href?: string }> {
  const category = brief.category.toLowerCase();
  const menuLabel = /\b(tasting|fine\s*dining|kaiseki|omakase)\b/.test(category)
    ? "Tasting Menu"
    : /\b(cafe|coffee|bakery)\b/.test(category)
      ? "Offerings"
      : "Menu";

  // Multi-page sites navigate between pages, not between anchors on one page.
  if (sitePages && sitePages.length > 1) {
    return sitePages
      .filter((item) => item.role !== "home")
      .map((item) => ({
        label: item.role === "menu" ? menuLabel : item.title,
        target: (item.sections.find(
          (section) => section !== "header" && section !== "footer",
        ) ?? "hero") as SectionType,
        href: item.path,
      }));
  }

  const present = new Set(presentSections);
  const candidates: Array<{ label: string; target: SectionType }> = [
    { label: "About", target: "about" },
    { label: menuLabel, target: "menu" },
    { label: "Gallery", target: "gallery" },
    { label: "Team", target: "team" },
    { label: "Reservations", target: "reservation" },
    { label: "Contact", target: "contact" },
  ];

  return candidates.filter((item) => present.has(item.target));
}

/**
 * Builds a brief-derived header tagline when copy is missing or too generic.
 */
function defaultHeaderTagline(brief: Brief): string {
  const place = brief.address?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  if (place) return `${brief.category} in ${place}`;
  return `${brief.category} worth seeking out`;
}

/**
 * Runs copy generation with one fact-check retry.
 */
async function generateCopy(
  sectionType: SectionType,
  componentId: string,
  brief: Brief,
  useFixture: boolean,
  family: PageFamily,
): Promise<Record<string, unknown>> {
  if (useFixture) {
    return writeCopyFixture({ componentId, brief, family });
  }

  let copy = await writeCopy({ sectionType, componentId, brief, family });
  let check = factCheck({ copy, brief });

  if (!check.ok) {
    copy = await writeCopy({
      sectionType,
      componentId,
      brief,
      family,
      flaggedSpans: check.flaggedSpans,
    });
    check = factCheck({ copy, brief });

    if (!check.ok) {
      throw new Error(
        `Fact-check failed for ${sectionType} after retry: ${check.flaggedSpans.join(", ")}`,
      );
    }
  }

  return copy;
}

/**
 * Picks components and filters sections that cannot be rendered.
 * Honors Creative Director hints; tracks recent suffixes to avoid stickiness.
 */
function planSectionComponents(
  sectionTypes: readonly SectionType[],
  family: PageFamily,
  brief: Brief,
  chatText: string,
  direction: CreativeDirection,
  /** Shared across every page of a site so photographs are not reused. */
  usedPaths: Set<string> = new Set<string>(),
  pageLabel = "/",
  pressure: DiversityPressure | null = null,
  /** Layout plan for this page specifically. */
  pageRhythm: readonly SectionPlanItem[] = [],
): {
  planned: PlannedSection[];
  droppedSections: SectionType[];
  usedPaths: Set<string>;
  traces: SelectionTrace[];
} {
  const planned: PlannedSection[] = [];
  const droppedSections: SectionType[] = [];
  const traces: SelectionTrace[] = [];
  const recentSuffixes: string[] = [];
  const imageSeed = direction.seed;

  const dnaStyles = designStyleTokens(brief, chatText, direction);
  const dnaDensity = direction.designSystem?.density ?? "normal";
  const listCounts = availableListCounts(brief, chatText);

  let previousSpec: ComponentSpec | null = null;
  const usedLayoutFamilies: LayoutFamily[] = [];

  for (const sectionType of sectionTypes) {
    const preferComponentId = direction.sectionVariantHints[sectionType];
    const planItem =
      pageRhythm.find((item) => item.type === sectionType) ??
      direction.sectionPlan?.find((item) => item.type === sectionType) ??
      null;

    /** Sections where user-uploaded photos are preferred over catalog images. */
    const isPhotoSection =
      sectionType === "hero" || sectionType === "about" || sectionType === "gallery";
    const userPhotos = brief.photos.length > 0 && isPhotoSection ? brief.photos : undefined;

    const planForSection: SectionPlanItem =
      planItem ?? {
        type: sectionType,
        emphasis: "standard",
        layoutIntent: "centered",
        background: "base",
        spacing: "normal",
      };

    const availableMedia = countAvailableMedia(
      sectionType,
      family,
      brief,
      imageSeed,
      userPhotos,
    );

    const { candidates, relaxed } = resolveCandidates({
      section: sectionType,
      family,
      surface: planForSection.background,
      available: { media: availableMedia, listCounts },
    });

    if (candidates.length === 0) {
      // No implementation exists for this section in this family at all.
      droppedSections.push(sectionType);
      continue;
    }

    const context: RankContext = {
      plan: planForSection,
      dnaStyles,
      dnaDensity,
      previous: previousSpec,
      usedLayoutFamilies,
      availableMedia,
      seed: `${direction.seed}:${pageLabel}`,
      pressure,
    };
    const result = rankCandidates(candidates, context);
    const spec = result.chosen!;
    const componentId = spec.id;

    const trace: SelectionTrace = {
      page: pageLabel,
      section: sectionType,
      source: "catalog",
      chosen: componentId,
      candidates: candidates.length,
      relaxed,
      explain: explainChoice(result),
      scores: result.ranked.map((entry) => ({
        id: entry.spec.id,
        total: Number(entry.total.toFixed(2)),
        terms: entry.terms,
      })),
    };

    if (sectionType === "gallery") {
      // Availability check only — final paths reserved in buildAssets with usedPaths.
      const galleryAvailable = pickGalleryImages(
        1,
        family,
        brief.category,
        imageSeed,
        undefined,
        userPhotos,
      );
      if (galleryAvailable.length === 0 && !userPhotos?.length) {
        droppedSections.push(sectionType);
        continue;
      }
      planned.push({ sectionType, componentId, imagePath: null, preferPaths: userPhotos, spec });
      previousSpec = spec;
      usedLayoutFamilies.push(spec.layoutFamily);
      traces.push(trace);
      continue;
    }

    // Only reserve a photograph when the chosen component actually renders one.
    const wantsMedia = spec.media.max > 0;
    const imagePath = wantsMedia
      ? pickImage({
          sectionType,
          orientation: orientationForSection(sectionType),
          family,
          category: brief.category,
          seed: imageSeed,
          usedPaths,
          preferPaths: userPhotos,
        })
      : null;

    if (spec.media.min > 0 && !imagePath) {
      droppedSections.push(sectionType);
      continue;
    }

    planned.push({ sectionType, componentId, imagePath, preferPaths: userPhotos, spec });
    previousSpec = spec;
    usedLayoutFamilies.push(spec.layoutFamily);
    traces.push(trace);
  }

  return { planned, droppedSections, usedPaths, traces };
}

/**
 * Style vocabulary the Design DNA is expressed in, matched against spec.styles.
 */
function designStyleTokens(
  brief: Brief,
  chatText: string,
  direction: CreativeDirection,
): string[] {
  const tokens = new Set<string>();
  for (const word of [...(brief.vibe ?? []), brief.category, chatText].join(" ").toLowerCase().split(/[^a-z]+/)) {
    if (word.length > 3) tokens.add(word);
  }
  // Archetype carries design meaning the raw words often miss.
  const byArchetype: Record<string, string[]> = {
    story_led: ["story", "editorial", "warm"],
    menu_forward: ["dish-led", "readable", "classic"],
    visual_immersive: ["photographic", "cinematic", "kinetic"],
    reservation_first: ["restrained", "luxury", "quiet"],
    neighbourhood: ["warm", "classic", "clean"],
    quick_service: ["bold", "direct", "modern"],
  };
  for (const token of byArchetype[direction.archetype ?? ""] ?? []) {
    tokens.add(token);
  }
  if (direction.designSystem?.density === "spacious") tokens.add("quiet");
  return [...tokens];
}

/**
 * How many list rows the brief can actually supply, for hard gating.
 */
function availableListCounts(
  brief: Brief,
  chatText: string,
): Record<string, number> {
  return {
    items: Math.max(
      brief.menuItems.length,
      briefTestimonials(brief).length,
      defaultServices(brief, chatText).length,
      realStats(brief).length,
    ),
    members: briefTeam(brief).length,
  };
}

/**
 * Upper bound on images this section could be given, for media gating.
 */
function countAvailableMedia(
  sectionType: SectionType,
  family: PageFamily,
  brief: Brief,
  seed: string | null,
  preferPaths?: string[],
): number {
  if (preferPaths?.length) return preferPaths.length;
  const pool = pickSectionImages(
    sectionType,
    4,
    family,
    brief.category,
    seed,
    undefined,
  );
  return pool.length;
}

/**
 * Orchestrates the build pipeline in fixed order (Creative Director after brief).
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const useFixture =
    input.useFixture ?? process.env.USE_FIXTURE_BRIEF === "true";
  const stages = createInitialStageLog();
  const onStage = input.onStage;

  let brief: Brief;

  if (input.brief) {
    // Intake already verified; do not re-run verifyBriefAgainstSource.
    brief = input.brief;
    emitStage(stages, "Brief Extractor", "done", onStage, 0);
  } else {
    const extractStart = Date.now();
    emitStage(stages, "Brief Extractor", "running", onStage);
    const rawBrief = useFixture
      ? FIXTURE_BRIEF
      : await extractBrief(input.chatText);
    brief = useFixture
      ? rawBrief
      : verifyBriefAgainstSource(rawBrief, input.chatText);
    await completeStage(stages, "Brief Extractor", onStage, extractStart);
  }

  const ledger = input.ledger ?? NULL_LEDGER;

  const directionStart = Date.now();
  emitStage(stages, "Creative Director", "running", onStage);

  // The cohort depends on the family, which the director resolves — so take a
  // first pass on the family only, then measure pressure for that cohort.
  const provisionalFamily = input.family ?? inferPageFamily(brief, input.chatText);
  const provisionalPressure = measurePressure(
    ledger,
    cohortKey(provisionalFamily, undefined),
    "family",
  );

  const direction = await runCreativeDirector({
    brief,
    chatText: input.chatText,
    family: input.family,
    useFixture,
    preferredPrograms: provisionalPressure.leastUsedPrograms(surfaceProgramIds()),
  });
  const family = direction.family;
  const directionMs = await ensureStageFeel("Creative Director", directionStart);
  emitStage(stages, "Creative Director", "done", onStage, directionMs, {
    message: "Direction locked in",
    detail: direction.rationale,
  });

  const planStart = Date.now();
  emitStage(stages, "Section Planner", "running", onStage);
  const sectionTypes = planSections({
    brief,
    chatText: input.chatText,
    direction,
  });
  // Decide the site's page structure before resolving any component, so a
  // multi-page request produces real pages instead of one long scroll.
  const sitePlan = planSite({
    brief,
    chatText: input.chatText,
    sections: sectionTypes,
  });
  direction.sitePlan = sitePlan;
  await completeStage(stages, "Section Planner", onStage, planStart);

  const pickStart = Date.now();
  emitStage(stages, "Component Picker", "running", onStage);

  // Image reuse is tracked across the whole site, not per page, so a five-page
  // site does not put the same photograph on every page.
  const usedPaths = new Set<string>();
  const droppedSections: SectionType[] = [];
  const pressure = measurePressure(
    ledger,
    cohortKey(family, direction.archetype),
  );

  const selectionTraces: SelectionTrace[] = [];
  // Rhythm is per page. Planning it once over the whole section list and then
  // splitting that list across pages breaks the guarantees the rules exist to
  // provide — a five-page site would inherit fragments and could stack three
  // dark bands at the end of its home page.
  const rhythmByPage = new Map<string, SectionPlanItem[]>(
    sitePlan.pages.map((pagePlan) => [
      pagePlan.path,
      buildSectionRhythm({
        sectionTypes: pagePlan.sections,
        seed: `${direction.seed}:${pagePlan.path}`,
        density: direction.designSystem?.density ?? "normal",
        signatureSection:
          pagePlan.role === "home" ? direction.signature?.section ?? null : null,
        existing: direction.sectionPlan,
        preferredPrograms: provisionalPressure.leastUsedPrograms(
          surfaceProgramIds(),
        ),
      }),
    ]),
  );

  const perPagePlans = sitePlan.pages.map((pagePlan) => {
    const result = planSectionComponents(
      pagePlan.sections,
      family,
      brief,
      input.chatText,
      direction,
      usedPaths,
      pagePlan.path,
      pressure,
      rhythmByPage.get(pagePlan.path) ?? direction.sectionPlan ?? [],
    );
    droppedSections.push(...result.droppedSections);
    selectionTraces.push(...result.traces);
    return { pagePlan, planned: result.planned };
  });
  await completeStage(stages, "Component Picker", onStage, pickStart);

  const copyStart = Date.now();
  emitStage(stages, "Copywriter", "running", onStage);
  emitStage(stages, "Fact-Safety", "running", onStage);

  const { writeAllSectionCopy } = await import("./writeAllCopy.js");
  const copyByPage = await Promise.all(
    perPagePlans.map(({ planned }) =>
      writeAllSectionCopy({
        brief,
        direction,
        sections: planned.map((item) => ({
          sectionType: item.sectionType,
          componentId: item.componentId,
        })),
        useFixture,
      }),
    ),
  );

  await completeStage(stages, "Copywriter", onStage, copyStart);
  // Fact-Safety ran alongside copy — complete in the same window (no second pad).
  emitStage(stages, "Fact-Safety", "done", onStage, Date.now() - copyStart);

  const imageStart = Date.now();
  emitStage(stages, "Image Picker", "running", onStage);

  const generatedPages: GeneratedPage[] = [];

  for (let pageIndex = 0; pageIndex < perPagePlans.length; pageIndex += 1) {
    const { pagePlan, planned } = perPagePlans[pageIndex]!;
    const allCopy = copyByPage[pageIndex] ?? {};
    const presentSections = planned.map((item) => item.sectionType);
    const sections: PageSection[] = [];

    const pageRhythm = rhythmByPage.get(pagePlan.path) ?? [];
    for (const { sectionType, componentId } of planned) {
      const planItem =
        pageRhythm.find((item) => item.type === sectionType) ??
        direction.sectionPlan?.find((item) => item.type === sectionType);
      sections.push({
        type: sectionType,
        componentId,
        content: allCopy[sectionType] ?? {},
        assets: [],
        layout: planItem
          ? {
              emphasis: planItem.emphasis,
              intent: planItem.layoutIntent,
              background: planItem.background,
              spacing: planItem.spacing,
            }
          : undefined,
      });
    }

    for (let index = 0; index < planned.length; index += 1) {
      const { sectionType, imagePath, preferPaths, spec } = planned[index]!;
      const section = sections[index];
      if (!section) continue;

      section.content = enrichSectionContent(
        sectionType,
        section.content,
        brief,
        presentSections,
        input.chatText,
        sitePlan.pages,
      );
      section.assets = buildAssets({
        sectionType,
        imagePath,
        family,
        spec,
        category: brief.category,
        seed: direction.seed,
        usedPaths,
        preferPaths,
      });
    }

    const page = assemblePage(sections, brief);
    if (direction.designSystem) {
      page.design = {
        density: direction.designSystem.density,
        typeScale: direction.designSystem.typeScale,
      };
    }
    // Minimal stays ink/paper by design — but only its *colour* is fixed. The
    // Creative Director's type choice must still reach the page, or typography
    // silently stops being a design decision for this family.
    if (family === "minimal") {
      const minimal = themeOverridesForFamily("minimal");
      page.themeOverrides = {
        ...minimal,
        ...(direction.palette?.fontDisplay
          ? { fontDisplay: direction.palette.fontDisplay }
          : {}),
        ...(direction.palette?.fontBody
          ? { fontBody: direction.palette.fontBody }
          : {}),
      };
    } else if (direction.palette) {
      applyCreativePalette(page, direction.palette);
    }
    pruneNavToPresentSections(page);

    generatedPages.push({
      role: pagePlan.role,
      title: pagePlan.title,
      path: pagePlan.path,
      page,
    });
  }

  await completeStage(stages, "Image Picker", onStage, imageStart);

  const assembleStart = Date.now();
  emitStage(stages, "Assembler", "running", onStage);

  const homePage = generatedPages[0]!.page;

  // Assembled-page fact safety (names/hours/metrics absent from brief).
  const { factCheckPage } = await import("./factCheckPage.js");
  for (const generated of generatedPages) {
    const pageFacts = factCheckPage({ page: generated.page, brief });
    if (!pageFacts.ok) {
      console.warn(
        `[runPipeline] factCheckPage flagged on ${generated.path}:`,
        pageFacts.flaggedSpans,
      );
    }
  }

  await completeStage(stages, "Assembler", onStage, assembleStart);

  const renderStart = Date.now();
  emitStage(stages, "Renderer", "running", onStage);
  await completeStage(stages, "Renderer", onStage, renderStart);

  const homeSpecs = perPagePlans[0]?.planned ?? [];
  const fingerprint: BuildFingerprint = {
    cohort: cohortKey(family, direction.archetype),
    components: perPagePlans.flatMap((entry) =>
      entry.planned.map((item) => item.componentId),
    ),
    layoutsBySection: perPagePlans.flatMap((entry) =>
      entry.planned.map((item) => ({
        section: item.sectionType,
        layoutFamily: item.spec.layoutFamily,
      })),
    ),
    compositionSignature: homeSpecs
      .map((item) => item.spec.layoutFamily)
      .join(">"),
    surfaceProgram: surfaceProgramFor(
      direction.seed,
      provisionalPressure.leastUsedPrograms(surfaceProgramIds()),
    ),
    typePairId: direction.typePairId,
  };
  ledger.record(fingerprint);

  return {
    page: homePage,
    pages: generatedPages,
    brief,
    family,
    droppedSections,
    stages,
    direction,
    selection: selectionTraces,
    fingerprint,
  };
}

/**
 * Keeps header/footer nav links only for sections that exist on the page.
 */
function pruneNavToPresentSections(page: Page): void {
  const present = new Set(page.sections.map((section) => section.type));

  for (const section of page.sections) {
    if (section.type !== "header" && section.type !== "footer") continue;
    const navItems = section.content.navItems;
    if (!Array.isArray(navItems)) continue;

    section.content.navItems = navItems.filter((item) => {
      if (typeof item !== "object" || item === null) return false;
      const entry = item as { target?: unknown; href?: unknown };
      // Cross-page links point at another page, so the section they name is
      // deliberately absent from this one.
      if (typeof entry.href === "string" && entry.href) return true;
      return (
        typeof entry.target === "string" &&
        present.has(entry.target as SectionType)
      );
    });
  }
}
