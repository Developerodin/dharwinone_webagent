import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  FileSearch,
  ImageIcon,
  LayoutTemplate,
  Paintbrush,
  PenLine,
  Puzzle,
  ShieldCheck,
  Upload,
  Wrench,
} from "lucide-react";
import type { PipelineStage, PipelineStageStatus } from "@/types/intake";

/** Canonical build pipeline agent order (mirrors backend). */
export const PIPELINE_AGENT_NAMES = [
  "Brief Extractor",
  "Section Planner",
  "Component Picker",
  "Copywriter",
  "Fact-Safety",
  "Image Picker",
  "Assembler",
  "Renderer",
] as const;

export type PipelineAgentName = (typeof PIPELINE_AGENT_NAMES)[number];

export type AgentStepView = {
  name: string;
  status: PipelineStageStatus;
  detail: string;
  ms?: number;
};

const AGENT_ICONS: Record<string, LucideIcon> = {
  "Brief Extractor": FileSearch,
  "Section Planner": LayoutTemplate,
  "Component Picker": Puzzle,
  Copywriter: PenLine,
  "Fact-Safety": ShieldCheck,
  "Image Picker": ImageIcon,
  Assembler: Wrench,
  Renderer: Paintbrush,
  Editor: PenLine,
  "Media Uploader": Upload,
};

/** Believable thinking lines when SSE has no richer message. */
const THINKING_COPY: Record<string, string[]> = {
  "Brief Extractor": [
    "Reading your brief…",
    "Extracting name, cuisine, and location…",
    "Structuring business details…",
  ],
  "Section Planner": [
    "Mapping page sections…",
    "Choosing a layout rhythm…",
    "Ordering hero → story → menu…",
  ],
  "Component Picker": [
    "Selecting section components…",
    "Matching variants to your vibe…",
    "Picking layouts that fit the brief…",
  ],
  Copywriter: [
    "Writing headlines and body copy…",
    "Tuning tone to your cuisine…",
    "Drafting menu descriptions…",
  ],
  "Fact-Safety": [
    "Checking claims against the brief…",
    "Removing invented details…",
    "Keeping copy grounded…",
  ],
  "Image Picker": [
    "Choosing photography…",
    "Matching images to each section…",
    "Balancing atmosphere and food shots…",
  ],
  Assembler: [
    "Assembling the page tree…",
    "Wiring sections together…",
    "Finalizing structure…",
  ],
  Renderer: [
    "Preparing the live preview…",
    "Compositing the page…",
    "Almost ready…",
  ],
};

const DONE_COPY: Record<string, string> = {
  "Brief Extractor": "Brief locked in",
  "Section Planner": "Sections planned",
  "Component Picker": "Components chosen",
  Copywriter: "Copy drafted",
  "Fact-Safety": "Facts verified",
  "Image Picker": "Images selected",
  Assembler: "Page assembled",
  Renderer: "Preview ready",
};

const PENDING_COPY = "Waiting for previous agents…";

/**
 * Returns the Lucide icon for a pipeline agent name.
 */
export function getAgentIcon(name: string): LucideIcon {
  return AGENT_ICONS[name] ?? CheckCircle2;
}

/**
 * Prefer SSE message, then detail, then curated fallbacks.
 */
export function getAgentThinkingCopy(
  name: string,
  status: PipelineStageStatus,
  sseMessage?: string,
): string {
  const trimmed = sseMessage?.trim();
  if (trimmed) return trimmed;

  if (status === "pending") return PENDING_COPY;
  if (status === "error") return "Something went wrong on this step";
  if (status === "done") {
    return DONE_COPY[name] ?? "Done";
  }

  const options = THINKING_COPY[name];
  if (!options?.length) return `${name} is working…`;

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % options.length;
  }
  return options[hash] ?? options[0];
}

/**
 * Formats display content for a stage agent chat message (text fallback).
 */
export function formatStageContent(stage: PipelineStage): string {
  const thinking = getAgentThinkingCopy(
    stage.name,
    stage.status,
    stage.message ?? stage.detail,
  );
  const collab =
    stage.message?.trim() && stage.detail?.trim() && stage.message.trim() !== stage.detail.trim()
      ? stage.detail.trim()
      : undefined;
  const collabLine = collab ? `\n${collab}` : "";

  if (stage.status === "running") {
    return `**${stage.name}** — ${thinking}${collabLine}`;
  }
  if (stage.status === "done") {
    const elapsed =
      stage.ms !== undefined
        ? stage.ms >= 1000
          ? ` · ${(stage.ms / 1000).toFixed(1)}s`
          : ` · ${stage.ms}ms`
        : "";
    return `**${stage.name}** — ${thinking}${elapsed}${collabLine}`;
  }
  if (stage.status === "error") {
    return `**${stage.name}** — ${thinking}${collabLine}`;
  }
  return `**${stage.name}** — ${thinking}${collabLine}`;
}

/**
 * Merges streamed stage messages with the full agent roster for a team view.
 */
export function buildAgentStepViews(
  stages: Array<{
    stageName?: string;
    stageStatus?: PipelineStageStatus;
    stageDetail?: string;
    content?: string;
    ms?: number;
  }>,
  options?: { includePendingRoster?: boolean },
): AgentStepView[] {
  const byName = new Map<string, AgentStepView>();

  for (const stage of stages) {
    if (!stage.stageName) continue;
    const status = stage.stageStatus ?? "running";
    byName.set(stage.stageName, {
      name: stage.stageName,
      status,
      detail: getAgentThinkingCopy(
        stage.stageName,
        status,
        stage.stageDetail,
      ),
      ms: stage.ms,
    });
  }

  if (!options?.includePendingRoster) {
    return PIPELINE_AGENT_NAMES.filter((name) => byName.has(name))
      .map((name) => byName.get(name)!)
      .concat(
        [...byName.values()].filter(
          (step) =>
            !(PIPELINE_AGENT_NAMES as readonly string[]).includes(step.name),
        ),
      );
  }

  return PIPELINE_AGENT_NAMES.map((name) => {
    const existing = byName.get(name);
    if (existing) return existing;
    return {
      name,
      status: "pending" as const,
      detail: PENDING_COPY,
    };
  });
}

/**
 * Finds the currently active (running) agent step, if any.
 */
export function getActiveAgentStep(
  steps: AgentStepView[],
): AgentStepView | undefined {
  return steps.find((step) => step.status === "running");
}
