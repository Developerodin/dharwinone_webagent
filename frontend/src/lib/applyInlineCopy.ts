import { createMessageId } from "@/lib/chatFormatters";
import { applyPageEdit } from "@/lib/applyPageEdit";
import {
  buildInlineCopyOp,
  formatInlineCopyRemark,
  patchPageCopy,
} from "@/lib/inlineCopy";
import {
  ensureProjectId,
  persistProjectState,
  syncPreviewPayload,
} from "@/lib/projectPersist";
import type { PageFamily } from "@/lib/pageFamily";
import type { PreviewPick } from "@/lib/resolvePreviewPick";
import type { HistoryEntry } from "@/lib/projectStorage";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";
import type { Dispatch, SetStateAction } from "react";

type AppendMessage = (message: Omit<ChatMessage, "id" | "timestamp">) => void;

export type ApplyInlineCopyDeps = {
  page: Page;
  brief: Brief;
  pageFamily: PageFamily | null;
  projectId: string | null;
  serverVersion?: number;
  setServerVersion?: (version: number) => void;
  enrichedChatText: string;
  useFixture: boolean;
  pick: PreviewPick;
  value: string;
  direction?: unknown;
  history?: HistoryEntry[];
  setHistory?: Dispatch<SetStateAction<HistoryEntry[]>>;
  setPage: (page: Page) => void;
  setProjectId: (id: string) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  appendMessage: AppendMessage;
  setPhase: (phase: ChatPhase) => void;
};

/**
 * Commits inline text via set_copy with no Ask/Editor agent card.
 */
export async function applyInlineCopy(
  deps: ApplyInlineCopyDeps,
): Promise<void> {
  const op = buildInlineCopyOp(deps.pick, deps.value);
  if (!op) {
    throw new Error("Click a headline, button, or paragraph to edit text.");
  }

  const family = deps.pageFamily ?? "premium";
  const previous = deps.page;
  const optimistic = patchPageCopy(
    deps.page,
    op.section,
    op.field,
    op.value,
  );
  deps.setPage(optimistic);

  try {
    const result = await applyPageEdit({
      ops: [op],
      targetSection: op.section,
      targetField: op.field,
      page: optimistic,
      brief: deps.brief,
      family,
      direction: deps.direction,
      useFixture: deps.useFixture,
      projectId: deps.projectId,
      expectedVersion: deps.serverVersion,
    });

    const snapshot: HistoryEntry = {
      page: previous,
      brief: deps.brief,
      family,
      direction: deps.direction,
      summary: `inline copy ${op.section}.${op.field}`,
      at: Date.now(),
    };
    const nextHistory = [...(deps.history ?? []), snapshot].slice(-20);
    deps.setHistory?.(() => nextHistory);

    deps.setPage(result.page);
    if (typeof result.version === "number") {
      deps.setServerVersion?.(result.version);
    }

    const activeId = ensureProjectId(deps.projectId);
    deps.setProjectId(activeId);
    syncPreviewPayload({
      page: result.page,
      family: result.family,
      businessName: result.brief.businessName,
      projectId: activeId,
    });

    const remark: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: formatInlineCopyRemark(deps.pick, op.value),
      timestamp: Date.now(),
    };

    deps.setMessages((current) => {
      const nextMessages = [...current, remark];
      persistProjectState({
        id: activeId,
        nextMessages,
        nextPhase: "editing",
        nextBrief: result.brief,
        nextPage: result.page,
        nextFamily: result.family,
        nextEnriched: deps.enrichedChatText,
        nextDirection: result.direction ?? deps.direction,
        nextHistory,
        serverVersion: result.version,
      });
      return nextMessages;
    });
    deps.setPhase("editing");
  } catch (error) {
    deps.setPage(previous);
    deps.appendMessage({
      role: "assistant",
      content:
        error instanceof Error
          ? `Couldn't save that text. ${error.message}`
          : "Couldn't save that text. Try again.",
    });
  }
}
