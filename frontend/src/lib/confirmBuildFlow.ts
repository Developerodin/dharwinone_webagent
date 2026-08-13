import type { Dispatch, SetStateAction } from "react";
import {
  createMessageId,
  formatBuildReadyMessage,
} from "@/lib/chatFormatters";
import { consumeBuildStream } from "@/lib/consumeBuildStream";
import {
  ensureProjectId,
  persistProjectState,
  syncPreviewPayload,
} from "@/lib/projectPersist";
import type { PageFamily } from "@/lib/pageFamily";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief, PipelineStage } from "@/types/intake";
import type { Page } from "@/types/page";

export type ConfirmBuildDeps = {
  brief: Brief;
  enrichedChatText: string;
  pageFamily: PageFamily | null;
  projectId: string | null;
  useFixture: boolean;
  appendMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateStageMessage: (stage: PipelineStage) => void;
  seedBuildStageRoster: () => void;
  setPage: (page: Page) => void;
  setPageFamily: (family: PageFamily) => void;
  setProjectId: (id: string) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPhase: (phase: ChatPhase) => void;
  setError: (error: string | null) => void;
  /** Clears in-memory edit history on new build. */
  clearHistory?: () => void;
  /** Stores direction from the build response. */
  setDirection?: (dir: unknown) => void;
};

/**
 * Runs the streamed build pipeline and persists the completed project.
 */
export async function runConfirmBuild(deps: ConfirmBuildDeps): Promise<void> {
  const {
    brief,
    enrichedChatText,
    pageFamily,
    projectId,
    useFixture,
    appendMessage,
    updateStageMessage,
    seedBuildStageRoster,
    setPage,
    setPageFamily,
    setProjectId,
    setMessages,
    setPhase,
    setError,
  } = deps;

  setPhase("building");
  appendMessage({
    role: "agent",
    content:
      "**Build team** starting — agents are building your page from scratch…",
  });
  seedBuildStageRoster();

  try {
    const query = useFixture ? "?fixture=1&stream=1" : "?stream=1";
    const response = await fetch(`/api/build${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatText: enrichedChatText,
        brief,
        confirmed: true,
        ...(pageFamily ? { family: pageFamily } : {}),
      }),
    });

    if (
      !response.ok &&
      response.headers.get("content-type")?.includes("json")
    ) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Build failed.");
    }

    const result = await consumeBuildStream(response, updateStageMessage);
    setPage(result.page);
    // Clear undo history on every new build.
    deps.clearHistory?.();

    const family =
      typeof result.meta.family === "string"
        ? (result.meta.family as PageFamily)
        : (pageFamily ?? "premium");
    setPageFamily(family);
    // Persist creative direction from build response when present.
    const buildDirection = result.direction ?? result.meta.direction;
    if (buildDirection !== undefined) deps.setDirection?.(buildDirection);

    const activeId = ensureProjectId(projectId);
    setProjectId(activeId);
    syncPreviewPayload({
      page: result.page,
      family,
      businessName: String(result.meta.businessName ?? brief.businessName),
      projectId: activeId,
    });

    const dropped = Array.isArray(result.meta.droppedSections)
      ? (result.meta.droppedSections as string[])
      : [];
    const droppedNote = dropped.length
      ? `\n\nSkipped sections (missing assets): ${dropped.join(", ")}`
      : "";

    const completionMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: formatBuildReadyMessage(brief.businessName, droppedNote),
      timestamp: Date.now(),
      pageFamily: family,
      actions: [
        { label: "Open preview ↗", action: "preview", variant: "primary" },
        { label: "Build another", action: "reset", variant: "outline" },
      ],
    };

    setMessages((current) => {
      const nextMessages = [...current, completionMessage];
      persistProjectState({
        id: activeId,
        nextMessages,
        nextPhase: "complete",
        nextBrief: brief,
        nextPage: result.page,
        nextFamily: family,
        nextEnriched: enrichedChatText,
        nextDirection: buildDirection,
        nextHistory: [],
      });
      return nextMessages;
    });
    setPhase("complete");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Build failed");
    appendMessage({
      role: "assistant",
      content: "Build failed. You can try again or adjust your brief.",
      actions: [{ label: "Start over", action: "reset", variant: "outline" }],
    });
    setPhase("confirm");
  }
}
