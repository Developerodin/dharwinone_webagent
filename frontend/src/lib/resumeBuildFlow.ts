import type { Dispatch, SetStateAction } from "react";
import {
  createMessageId,
  formatBuildReadyMessage,
} from "@/lib/chatFormatters";
import { consumeBuildStream } from "@/lib/consumeBuildStream";
import { latestBuildJob, openBuildJobStream } from "@/lib/projectApi";
import { persistProjectState, syncPreviewPayload } from "@/lib/projectPersist";
import { parsePageFamily, type PageFamily } from "@/lib/pageFamily";
import { loadProject } from "@/lib/projectStorage";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { PipelineStage } from "@/types/intake";
import type { Page } from "@/types/page";
import { formatRoundupTitle } from "@/lib/suggestionChips";

export type ResumeBuildDeps = {
  projectId: string;
  appendMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateStageMessage: (stage: PipelineStage) => void;
  seedBuildStageRoster: () => void;
  setPage: (page: Page) => void;
  setPageFamily: (family: PageFamily) => void;
  setServerVersion?: (version: number) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPhase: (phase: ChatPhase) => void;
  setError: (error: string | null) => void;
  setDirection?: (dir: unknown) => void;
};

/**
 * Reattaches to a build that was already running when this tab opened.
 *
 * A build takes tens of seconds and is charged whether or not anyone is
 * watching, so a reload in the middle of one must not read as "nothing
 * happened". The server keeps the job row; this replays it.
 *
 * Returns true when a build was picked up, so the caller can leave the
 * restored project state alone rather than overwriting a live build with a
 * stale cached page.
 */
export async function resumeBuildIfRunning(
  deps: ResumeBuildDeps,
): Promise<boolean> {
  // Read the project's own brief and family from the cache rather than from
  // the caller's state. Restoring a project sets that state in the same tick
  // this runs, so anything read from a closure here would still describe the
  // project the user just navigated away from.
  const cached = loadProject(deps.projectId);
  const brief = cached?.brief ?? null;
  const enrichedChatText = cached?.enrichedChatText ?? "";

  let job;
  try {
    job = await latestBuildJob(deps.projectId);
  } catch {
    // A failed lookup must never block opening a project.
    return false;
  }

  if (!job || (job.status !== "RUNNING" && job.status !== "QUEUED")) {
    return false;
  }

  deps.setPhase("building");
  deps.setError(null);
  deps.appendMessage({
    role: "agent",
    content:
      "**Build team** still working — picking up where your last session left off…",
  });
  deps.seedBuildStageRoster();

  try {
    const response = await openBuildJobStream(deps.projectId, job.jobId);
    const result = await consumeBuildStream(response, deps.updateStageMessage);

    const family =
      parsePageFamily(result.meta.family) ?? cached?.pageFamily ?? "premium";

    deps.setPage(result.page);
    deps.setPageFamily(family);
    if (typeof result.version === "number") {
      deps.setServerVersion?.(result.version);
    }
    if (result.direction !== undefined) deps.setDirection?.(result.direction);

    const businessName =
      typeof result.meta.businessName === "string"
        ? result.meta.businessName
        : (brief?.businessName ?? "your site");

    syncPreviewPayload({
      page: result.page,
      family,
      businessName,
      projectId: deps.projectId,
    });

    const completionMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: formatBuildReadyMessage(businessName, ""),
      timestamp: Date.now(),
      pageFamily: family,
      kind: "roundup",
      roundupTitle: formatRoundupTitle(businessName),
      actions: [
        { label: "Open preview ↗", action: "preview", variant: "primary" },
        { label: "Build another", action: "reset", variant: "outline" },
      ],
    };

    deps.setMessages((current) => {
      const nextMessages = [...current, completionMessage];
      persistProjectState({
        id: deps.projectId,
        nextMessages,
        nextPhase: "complete",
        nextBrief: brief,
        nextPage: result.page,
        nextFamily: family,
        nextEnriched: enrichedChatText,
        nextDirection: result.direction,
        nextHistory: [],
        serverVersion: result.version,
      });
      return nextMessages;
    });
    deps.setPhase("complete");
    return true;
  } catch (error) {
    deps.setError(
      error instanceof Error
        ? error.message
        : "That build did not finish. You can run it again.",
    );
    deps.appendMessage({
      role: "assistant",
      content:
        "That build stopped before it finished. You can run it again from your brief.",
      actions: [{ label: "Start over", action: "reset", variant: "outline" }],
    });
    deps.setPhase("confirm");
    return true;
  }
}
