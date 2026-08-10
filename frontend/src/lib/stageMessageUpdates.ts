import { createMessageId } from "@/lib/chatFormatters";
import {
  formatStageContent,
  PIPELINE_AGENT_NAMES,
} from "@/lib/pipelineAgents";
import type { ChatMessage } from "@/types/chat";
import type { PipelineStage } from "@/types/intake";

/**
 * Maps a pipeline stage status onto chat message stageStatus.
 */
function toChatStageStatus(
  status: PipelineStage["status"],
): NonNullable<ChatMessage["stageStatus"]> {
  if (status === "error") return "error";
  if (status === "done") return "done";
  if (status === "pending") return "pending";
  return "running";
}

/**
 * Marks a pipeline stage done/error, then appends the follow-up chat message.
 * Keeps success CTAs from appearing while the stage is still "running".
 */
export function completeStageAndAppend(
  current: ChatMessage[],
  stage: PipelineStage,
  followUp: ChatMessage,
): ChatMessage[] {
  return [...applyStageToMessages(current, stage), followUp];
}

/**
 * Upserts a stage agent message, preferring the latest matching bubble.
 */
export function applyStageToMessages(
  current: ChatMessage[],
  stage: PipelineStage,
): ChatMessage[] {
  const content = formatStageContent(stage);
  const stageStatus = toChatStageStatus(stage.status);
  const stageDetail =
    stage.message?.trim() || stage.detail?.trim() || undefined;

  let index = -1;
  for (let i = current.length - 1; i >= 0; i -= 1) {
    const msg = current[i];
    if (msg?.role === "agent" && msg.stageName === stage.name) {
      index = i;
      break;
    }
  }

  if (index >= 0) {
    const next = [...current];
    next[index] = {
      ...next[index],
      content,
      stageStatus,
      stageDetail,
      stageMs: stage.ms,
    };
    return next;
  }

  return [
    ...current,
    {
      id: createMessageId(),
      role: "agent",
      content,
      timestamp: Date.now(),
      stageName: stage.name,
      stageStatus,
      stageDetail,
      stageMs: stage.ms,
    },
  ];
}

/**
 * Builds a fresh build-team roster (Brief done + remaining pending).
 */
export function createBuildStageRosterMessages(): ChatMessage[] {
  const roster: PipelineStage[] = [
    {
      name: "Brief Extractor",
      status: "done",
      message: "Brief locked in",
      detail: "Passed brief to Section Planner",
      ms: 0,
    },
    ...PIPELINE_AGENT_NAMES.filter((name) => name !== "Brief Extractor").map(
      (name) =>
        ({
          name,
          status: "pending" as const,
          message: "Waiting for previous agents…",
          detail: "Queued in the build pipeline",
        }) satisfies PipelineStage,
    ),
  ];

  return roster.map((stage) => ({
    id: createMessageId(),
    role: "agent" as const,
    content: formatStageContent(stage),
    timestamp: Date.now(),
    stageName: stage.name,
    stageStatus: stage.status,
    stageDetail: stage.message?.trim() || stage.detail?.trim(),
    stageMs: stage.ms,
  }));
}
