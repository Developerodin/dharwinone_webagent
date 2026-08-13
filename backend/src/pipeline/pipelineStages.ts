/** Ordered pipeline stages shown in the UI during build. */
export const PIPELINE_STAGE_NAMES = [
  "Brief Extractor",
  "Creative Director",
  "Section Planner",
  "Component Picker",
  "Copywriter",
  "Fact-Safety",
  "Image Picker",
  "Assembler",
  "Renderer",
] as const;

export type PipelineStageName = (typeof PIPELINE_STAGE_NAMES)[number];

export type PipelineStageStatus = "pending" | "running" | "done" | "error";

export type PipelineStageLog = {
  name: PipelineStageName;
  status: PipelineStageStatus;
  ms?: number;
  /** Short human thinking line for the UI. */
  message?: string;
  /** Optional “agents collaborating” style detail. */
  detail?: string;
};

export type StageCallback = (stage: PipelineStageLog) => void;

export type EmitStageOptions = {
  message?: string;
  detail?: string;
};

/** Trust-oriented running copy — sounds like building from scratch. */
const STAGE_RUNNING_MESSAGE: Record<PipelineStageName, string> = {
  "Brief Extractor": "Reading your brief and locking in business facts…",
  "Creative Director": "Setting visual direction — theme, palette, layouts…",
  "Section Planner": "Planning page sections from scratch…",
  "Component Picker": "Choosing layouts that fit your brand…",
  Copywriter: "Writing original headlines and body copy…",
  "Fact-Safety": "Checking copy against your menu and contact details…",
  "Image Picker": "Picking images that match the vibe…",
  Assembler: "Composing sections into a full page…",
  Renderer: "Preparing your live preview…",
};

/** Done-state trust copy. */
const STAGE_DONE_MESSAGE: Record<PipelineStageName, string> = {
  "Brief Extractor": "Brief locked in",
  "Creative Director": "Direction locked in",
  "Section Planner": "Section plan ready",
  "Component Picker": "Layouts selected",
  Copywriter: "Copy drafted",
  "Fact-Safety": "Facts verified",
  "Image Picker": "Images selected",
  Assembler: "Page assembled",
  Renderer: "Preview ready",
};

/** Light collaboration handoff lines. */
const STAGE_RUNNING_DETAIL: Record<PipelineStageName, string> = {
  "Brief Extractor": "Agent extracting structured facts from your description",
  "Creative Director": "Picking family, brand palette, and section variants",
  "Section Planner": "Coordinating with Component Picker on section order",
  "Component Picker": "Handing section specs to Copywriter",
  Copywriter: "Drafting section-by-section with Fact-Safety watching",
  "Fact-Safety": "Cross-checking names, prices, and contact details",
  "Image Picker": "Matching photos to each section’s layout",
  Assembler: "Merging copy, components, and images into one page",
  Renderer: "Packaging the page for preview",
};

const STAGE_DONE_DETAIL: Record<PipelineStageName, string> = {
  "Brief Extractor": "Passed brief to Creative Director",
  "Creative Director": "Passed direction to Section Planner",
  "Section Planner": "Passed layout plan to Component Picker",
  "Component Picker": "Passed component map to Copywriter",
  Copywriter: "Passed drafts to Fact-Safety",
  "Fact-Safety": "Cleared copy for Image Picker",
  "Image Picker": "Passed assets to Assembler",
  Assembler: "Passed composed page to Renderer",
  Renderer: "Agents finished — preview is live",
};

/**
 * Returns the default running thinking line for a stage.
 */
export function stageRunningMessage(name: PipelineStageName): string {
  return STAGE_RUNNING_MESSAGE[name];
}

/**
 * Returns the default done thinking line for a stage.
 */
export function stageDoneMessage(name: PipelineStageName): string {
  return STAGE_DONE_MESSAGE[name];
}

/**
 * Returns the default running collaboration detail for a stage.
 */
export function stageRunningDetail(name: PipelineStageName): string {
  return STAGE_RUNNING_DETAIL[name];
}

/**
 * Returns the default done collaboration detail for a stage.
 */
export function stageDoneDetail(name: PipelineStageName): string {
  return STAGE_DONE_DETAIL[name];
}

/**
 * Creates an initial pending stage log for all pipeline steps.
 */
export function createInitialStageLog(): PipelineStageLog[] {
  return PIPELINE_STAGE_NAMES.map((name) => ({
    name,
    status: "pending" as const,
    message: "Waiting for previous agents…",
    detail: "Queued in the build pipeline",
  }));
}

/**
 * Emits a stage update and records timing/status copy in the shared log.
 */
export function emitStage(
  log: PipelineStageLog[],
  name: PipelineStageName,
  status: PipelineStageStatus,
  onStage?: StageCallback,
  ms?: number,
  options?: EmitStageOptions,
): void {
  const message =
    options?.message ??
    (status === "running"
      ? stageRunningMessage(name)
      : status === "done"
        ? stageDoneMessage(name)
        : undefined);
  const detail =
    options?.detail ??
    (status === "running"
      ? stageRunningDetail(name)
      : status === "done"
        ? stageDoneDetail(name)
        : undefined);

  const entry = log.find((stage) => stage.name === name);
  if (entry) {
    entry.status = status;
    if (ms !== undefined) {
      entry.ms = ms;
    }
    if (message !== undefined) {
      entry.message = message;
    }
    if (detail !== undefined) {
      entry.detail = detail;
    }
  }

  onStage?.({ name, status, ms, message, detail });
}
