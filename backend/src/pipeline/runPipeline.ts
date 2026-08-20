import type { PageFamily } from "../config/pageFamily.js";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { CreativeDirection } from "../schemas/creativeDirection.schema.js";
import { getManifest } from "../schemas/manifest.schema.js";
import type { Page, PageSection, SectionType } from "../schemas/page.schema.js";
import { assemblePage } from "./assemblePage.js";
import { hydrateLocationFacts } from "./applyLocationOp.js";
import {
  applyCreativePalette,
  runCreativeDirector,
} from "./creativeDirector.js";
import { extractBrief } from "./extractBrief.js";
import { factCheck } from "./factCheck.js";
import { pickComponent } from "./pickComponent.js";
import {
  orientationForSection,
  pickGalleryImages,
  pickImage,
  pickSectionImages,
} from "./pickImage.js";
import { planSections } from "./planSections.js";
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
};

export type PipelineResult = {
  page: Page;
  brief: Brief;
  family: PageFamily;
  droppedSections: SectionType[];
  stages: PipelineStageLog[];
  direction: CreativeDirection;
};

type PlannedSection = {
  sectionType: SectionType;
  componentId: string;
  imagePath: string | null;
  /** User-uploaded photo paths to prefer over catalog images. */
  preferPaths?: string[];
};

/**
 * Builds section assets, preferring user-uploaded paths then catalog picks.
 * @param preferPaths - User-provided photo paths to use before catalog images.
 */
function buildAssets(
  sectionType: SectionType,
  imagePath: string | null,
  family: PageFamily,
  componentId: string,
  category?: string | null,
  seed?: string | null,
  usedPaths?: Set<string>,
  preferPaths?: string[],
): PageSection["assets"] {
  if (sectionType === "gallery") {
    const paths = pickGalleryImages(4, family, category, seed, usedPaths, preferPaths);
    if (paths.length === 0 && imagePath) {
      return [{ key: "gallery-0", imagePath }];
    }
    return paths.map((path, index) => ({
      key: `gallery-${index}`,
      imagePath: path,
    }));
  }

  if (sectionType === "hero" && componentId.endsWith("-03")) {
    const paths = pickSectionImages(
      "hero",
      3,
      family,
      category,
      seed,
      usedPaths,
      preferPaths,
    );
    if (paths.length === 0 && imagePath) {
      return [{ key: "slide-0", imagePath }];
    }
    return paths.map((path, index) => ({
      key: `slide-${index}`,
      imagePath: path,
    }));
  }

  if (sectionType === "team") {
    const paths = pickSectionImages(
      "team",
      3,
      family,
      category,
      seed,
      usedPaths,
    );
    if (paths.length === 0 && imagePath) {
      return [{ key: "team-0", imagePath }];
    }
    return paths.map((path, index) => ({
      key: `team-${index}`,
      imagePath: path,
    }));
  }

  if (!imagePath) return [];
  return [{ key: "primary", imagePath }];
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
      navItems: defaultNavItems(brief, presentSections),
    };
  }

  if (sectionType === "contact") {
    return hydrateLocationFacts(content, brief);
  }

  if (sectionType === "footer") {
    return {
      ...hydrateLocationFacts(content, brief),
      brandName: brief.businessName,
      navItems: defaultNavItems(brief, presentSections),
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
): Array<{ label: string; target: SectionType }> {
  const present = new Set(presentSections);
  const category = brief.category.toLowerCase();
  const menuLabel = /\b(tasting|fine\s*dining|kaiseki|omakase)\b/.test(category)
    ? "Tasting Menu"
    : /\b(cafe|coffee|bakery)\b/.test(category)
      ? "Offerings"
      : "Menu";

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
  sectionTypes: SectionType[],
  family: PageFamily,
  brief: Brief,
  chatText: string,
  direction: CreativeDirection,
): {
  planned: PlannedSection[];
  droppedSections: SectionType[];
  usedPaths: Set<string>;
} {
  const planned: PlannedSection[] = [];
  const droppedSections: SectionType[] = [];
  const recentSuffixes: string[] = [];
  const imageSeed = direction.seed;
  const usedPaths = new Set<string>();

  for (const sectionType of sectionTypes) {
    const preferComponentId = direction.sectionVariantHints[sectionType];
    const componentId = pickComponent(sectionType, family, {
      brief,
      chatText,
      recentSuffixes,
      preferComponentId,
    });
    const manifest = getManifest(componentId);

    /** Sections where user-uploaded photos are preferred over catalog images. */
    const isPhotoSection =
      sectionType === "hero" || sectionType === "about" || sectionType === "gallery";
    const userPhotos = brief.photos.length > 0 && isPhotoSection ? brief.photos : undefined;

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
      const suffix = componentId.match(/-(\d+)$/)?.[1] ?? "01";
      recentSuffixes.push(suffix);
      if (recentSuffixes.length > 4) recentSuffixes.shift();
      planned.push({ sectionType, componentId, imagePath: null, preferPaths: userPhotos });
      continue;
    }

    const imagePath = pickImage({
      sectionType,
      orientation: orientationForSection(sectionType),
      family,
      category: brief.category,
      seed: imageSeed,
      usedPaths,
      preferPaths: userPhotos,
    });

    if (manifest.requiresImage && !imagePath) {
      droppedSections.push(sectionType);
      continue;
    }

    const suffix = componentId.match(/-(\d+)$/)?.[1] ?? "01";
    recentSuffixes.push(suffix);
    if (recentSuffixes.length > 4) recentSuffixes.shift();

    planned.push({ sectionType, componentId, imagePath, preferPaths: userPhotos });
  }

  return { planned, droppedSections, usedPaths };
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

  const directionStart = Date.now();
  emitStage(stages, "Creative Director", "running", onStage);
  const direction = await runCreativeDirector({
    brief,
    chatText: input.chatText,
    family: input.family,
    useFixture,
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
  await completeStage(stages, "Section Planner", onStage, planStart);

  const pickStart = Date.now();
  emitStage(stages, "Component Picker", "running", onStage);
  const { planned, droppedSections, usedPaths } = planSectionComponents(
    sectionTypes,
    family,
    brief,
    input.chatText,
    direction,
  );
  await completeStage(stages, "Component Picker", onStage, pickStart);

  const sections: PageSection[] = [];
  const presentSections = planned.map((item) => item.sectionType);

  const copyStart = Date.now();
  emitStage(stages, "Copywriter", "running", onStage);
  emitStage(stages, "Fact-Safety", "running", onStage);

  const { writeAllSectionCopy } = await import("./writeAllCopy.js");
  const allCopy = await writeAllSectionCopy({
    brief,
    direction,
    sections: planned.map((item) => ({
      sectionType: item.sectionType,
      componentId: item.componentId,
    })),
    useFixture,
  });

  for (const { sectionType, componentId } of planned) {
    const planItem = direction.sectionPlan?.find((item) => item.type === sectionType);
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

  await completeStage(stages, "Copywriter", onStage, copyStart);
  // Fact-Safety ran alongside copy — complete in the same window (no second pad).
  emitStage(stages, "Fact-Safety", "done", onStage, Date.now() - copyStart);

  const imageStart = Date.now();
  emitStage(stages, "Image Picker", "running", onStage);

  for (let index = 0; index < planned.length; index += 1) {
    const { sectionType, imagePath, componentId, preferPaths } = planned[index];
    const section = sections[index];
    if (!section) continue;

    section.content = enrichSectionContent(
      sectionType,
      section.content,
      brief,
      presentSections,
      input.chatText,
    );
    section.assets = buildAssets(
      sectionType,
      imagePath,
      family,
      componentId,
      brief.category,
      direction.seed,
      usedPaths,
      preferPaths,
    );
  }

  await completeStage(stages, "Image Picker", onStage, imageStart);

  const assembleStart = Date.now();
  emitStage(stages, "Assembler", "running", onStage);
  const page = assemblePage(sections, brief);
  // Creative palette wins (client brand or invented); brief seed is fallback only.
  if (direction.palette) {
    applyCreativePalette(page, direction.palette);
  }
  pruneNavToPresentSections(page);

  // Assembled-page fact safety (names/hours/metrics absent from brief).
  const { factCheckPage } = await import("./factCheckPage.js");
  const pageFacts = factCheckPage({ page, brief });
  if (!pageFacts.ok) {
    console.warn("[runPipeline] factCheckPage flagged:", pageFacts.flaggedSpans);
  }

  await completeStage(stages, "Assembler", onStage, assembleStart);

  const renderStart = Date.now();
  emitStage(stages, "Renderer", "running", onStage);
  await completeStage(stages, "Renderer", onStage, renderStart);

  return { page, brief, family, droppedSections, stages, direction };
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

    section.content.navItems = navItems.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { target?: unknown }).target === "string" &&
        present.has((item as { target: SectionType }).target),
    );
  }
}
