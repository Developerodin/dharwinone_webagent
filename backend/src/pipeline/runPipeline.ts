import {
  getDefaultPageFamily,
  type PageFamily,
} from "../config/pageFamily.js";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";
import { getManifest } from "../schemas/manifest.schema.js";
import type { Page, PageSection, SectionType } from "../schemas/page.schema.js";
import { assemblePage } from "./assemblePage.js";
import { inferPageFamily } from "./inferPageFamily.js";
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
  defaultServices,
  defaultStats,
  defaultTeam,
  defaultTestimonials,
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
  /** Component family override (premium | elegant | minimal | rustic | vibrant). */
  family?: PageFamily;
  onStage?: StageCallback;
};

export type PipelineResult = {
  page: Page;
  brief: Brief;
  family: PageFamily;
  droppedSections: SectionType[];
  stages: PipelineStageLog[];
};

type PlannedSection = {
  sectionType: SectionType;
  componentId: string;
  imagePath: string | null;
};

/**
 * Builds section assets from catalog picks.
 */
function buildAssets(
  sectionType: SectionType,
  imagePath: string | null,
  family: PageFamily,
  componentId: string,
  category?: string | null,
  seed?: string | null,
): PageSection["assets"] {
  if (sectionType === "gallery") {
    const paths = pickGalleryImages(4, family, category, seed);
    if (paths.length === 0 && imagePath) {
      return [{ key: "gallery-0", imagePath }];
    }
    return paths.map((path, index) => ({
      key: `gallery-${index}`,
      imagePath: path,
    }));
  }

  if (sectionType === "hero" && componentId.endsWith("-03")) {
    const paths = pickSectionImages("hero", 3, family, category, seed);
    if (paths.length === 0 && imagePath) {
      return [{ key: "slide-0", imagePath }];
    }
    return paths.map((path, index) => ({
      key: `slide-${index}`,
      imagePath: path,
    }));
  }

  if (sectionType === "team") {
    const paths = pickSectionImages("team", 3, family, category, seed);
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
): Record<string, unknown> {
  if (sectionType === "menu") {
    return {
      ...content,
      items: brief.menuItems,
    };
  }

  if (sectionType === "location_map") {
    return {
      ...content,
      phone: brief.phone,
      address: brief.address,
    };
  }

  if (sectionType === "services") {
    return { ...content, items: defaultServices(brief) };
  }

  if (sectionType === "stats") {
    return { ...content, items: defaultStats(brief) };
  }

  if (sectionType === "testimonials") {
    return { ...content, items: defaultTestimonials(brief) };
  }

  if (sectionType === "team") {
    return { ...content, members: defaultTeam(brief) };
  }

  if (sectionType === "reservation") {
    return {
      ...content,
      phone: brief.phone,
      address: brief.address,
    };
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
      navItems: defaultNavItems(),
    };
  }

  if (sectionType === "contact") {
    return {
      ...content,
      phone: brief.phone,
      address: brief.address,
    };
  }

  if (sectionType === "footer") {
    return {
      ...content,
      brandName: brief.businessName,
      phone: brief.phone,
      address: brief.address,
      navItems: defaultNavItems(),
    };
  }

  return content;
}

/**
 * Default in-page nav targets for header / footer.
 */
function defaultNavItems(): Array<{ label: string; target: SectionType }> {
  return [
    { label: "About", target: "about" },
    { label: "Menu", target: "menu" },
    { label: "Gallery", target: "gallery" },
    { label: "Reservations", target: "reservation" },
    { label: "Contact", target: "contact" },
  ];
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
): Promise<Record<string, unknown>> {
  if (useFixture) {
    return writeCopyFixture({ componentId, brief });
  }

  let copy = await writeCopy({ sectionType, componentId, brief });
  let check = factCheck({ copy, brief });

  if (!check.ok) {
    copy = await writeCopy({
      sectionType,
      componentId,
      brief,
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
 */
function planSectionComponents(
  sectionTypes: SectionType[],
  family: PageFamily,
  brief: Brief,
  chatText: string,
): {
  planned: PlannedSection[];
  droppedSections: SectionType[];
} {
  const planned: PlannedSection[] = [];
  const droppedSections: SectionType[] = [];

  for (const sectionType of sectionTypes) {
    const componentId = pickComponent(sectionType, family, {
      brief,
      chatText,
    });
    const manifest = getManifest(componentId);
    const imageSeed = `${brief.businessName}:${brief.category}`;
    const imagePath = pickImage({
      sectionType,
      orientation: orientationForSection(sectionType),
      family,
      category: brief.category,
      seed: imageSeed,
    });

    if (manifest.requiresImage && !imagePath && sectionType !== "gallery") {
      droppedSections.push(sectionType);
      continue;
    }

    if (sectionType === "gallery") {
      const galleryPaths = pickGalleryImages(
        4,
        family,
        brief.category,
        imageSeed,
      );
      if (galleryPaths.length === 0) {
        droppedSections.push(sectionType);
        continue;
      }
    }

    planned.push({ sectionType, componentId, imagePath });
  }

  return { planned, droppedSections };
}

/**
 * Orchestrates the 8-stage pipeline in fixed order.
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const useFixture =
    input.useFixture ?? process.env.USE_FIXTURE_BRIEF === "true";
  const stages = createInitialStageLog();
  const onStage = input.onStage;

  let brief: Brief;

  if (input.brief) {
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

  const family =
    input.family ?? inferPageFamily(brief, input.chatText) ?? getDefaultPageFamily();

  const planStart = Date.now();
  emitStage(stages, "Section Planner", "running", onStage);
  const sectionTypes = planSections();
  await completeStage(stages, "Section Planner", onStage, planStart);

  const pickStart = Date.now();
  emitStage(stages, "Component Picker", "running", onStage);
  const { planned, droppedSections } = planSectionComponents(
    sectionTypes,
    family,
    brief,
    input.chatText,
  );
  await completeStage(stages, "Component Picker", onStage, pickStart);

  const sections: PageSection[] = [];

  const copyStart = Date.now();
  emitStage(stages, "Copywriter", "running", onStage);
  emitStage(stages, "Fact-Safety", "running", onStage);

  for (const { sectionType, componentId } of planned) {
    const rawCopy = await generateCopy(
      sectionType,
      componentId,
      brief,
      useFixture,
    );

    sections.push({
      type: sectionType,
      componentId,
      content: rawCopy,
      assets: [],
    });
  }

  await completeStage(stages, "Copywriter", onStage, copyStart);
  // Fact-Safety ran alongside copy — complete in the same window (no second pad).
  emitStage(stages, "Fact-Safety", "done", onStage, Date.now() - copyStart);

  const imageStart = Date.now();
  emitStage(stages, "Image Picker", "running", onStage);

  for (let index = 0; index < planned.length; index += 1) {
    const { sectionType, imagePath, componentId } = planned[index];
    const section = sections[index];
    if (!section) continue;

    section.content = enrichSectionContent(
      sectionType,
      section.content,
      brief,
    );
    section.assets = buildAssets(
      sectionType,
      imagePath,
      family,
      componentId,
      brief.category,
      `${brief.businessName}:${brief.category}`,
    );
  }

  await completeStage(stages, "Image Picker", onStage, imageStart);

  const assembleStart = Date.now();
  emitStage(stages, "Assembler", "running", onStage);
  const page = assemblePage(sections);
  pruneNavToPresentSections(page);
  await completeStage(stages, "Assembler", onStage, assembleStart);

  const renderStart = Date.now();
  emitStage(stages, "Renderer", "running", onStage);
  await completeStage(stages, "Renderer", onStage, renderStart);

  return { page, brief, family, droppedSections, stages };
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
