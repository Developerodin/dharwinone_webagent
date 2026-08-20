import type { Dispatch, SetStateAction } from "react";
import { createMessageId } from "@/lib/chatFormatters";
import { performAsk, type AskResult } from "@/lib/performAsk";
import { performPageEdit } from "@/lib/performPageEdit";
import { newIntentKey, saveServerVersion } from "@/lib/projectApi";
import {
  ensureProjectId,
  persistProjectState,
  syncPreviewPayload,
} from "@/lib/projectPersist";
import {
  applyStageToMessages,
  completeStageAndAppend,
} from "@/lib/stageMessageUpdates";
import { applyLibraryMedia } from "@/lib/mediaLibrary";
import {
  formatUploadTargetLabel,
  isVideoFile,
  uploadSectionImage,
  type ImageUploadTarget,
} from "@/lib/uploadSectionImage";
import type { PageFamily } from "@/lib/pageFamily";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief, PipelineStage } from "@/types/intake";
import type { HistoryEntry } from "@/lib/projectStorage";
import type { Page } from "@/types/page";
import { parseLocationPickerIntent } from "@/lib/locationPickerIntent";

type AppendMessage = (message: Omit<ChatMessage, "id" | "timestamp">) => void;

type Specialist = NonNullable<AskResult["specialist"]>;

/**
 * Maps specialist to the agent card label shown during edits.
 */
function editorLabelFor(specialist?: Specialist | null): string {
  switch (specialist) {
    case "style":
      return "Style";
    case "layout":
      return "Layout";
    case "copy":
      return "Copy";
    default:
      return "Editor";
  }
}

export type RunEditFlowDeps = {
  instruction: string;
  page: Page;
  brief: Brief;
  pageFamily: PageFamily | null;
  projectId: string | null;
  /** Version the client is editing from, for optimistic concurrency. */
  serverVersion?: number;
  /** Records the version the server stored this edit as. */
  setServerVersion?: (version: number) => void;
  enrichedChatText: string;
  useFixture: boolean;
  appendMessage: AppendMessage;
  updateStageMessage: (stage: PipelineStage) => void;
  setPage: (page: Page) => void;
  setBrief: (brief: Brief) => void;
  setPageFamily: (family: PageFamily) => void;
  setProjectId: (id: string) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPhase: (phase: ChatPhase) => void;
  /** Optional specialist label for the agent card. */
  specialist?: Specialist | null;
  /** When set, skip Ask and apply this instruction directly. */
  skipAsk?: boolean;
  /** Stores a pending edit proposal from Ask (for Apply with Editor). */
  setPendingEditInstruction?: (instruction: string | null) => void;
  /** Explicit ops array — bypasses the LLM editor (section panel). */
  ops?: Array<Record<string, unknown>>;
  /** Section type context for targeted edits. */
  targetSection?: string;
  /** Content field context for click-scoped copy edits. */
  targetField?: string;
  /** Creative direction to forward and persist. */
  direction?: unknown;
  /** Current edit history — a snapshot is prepended before applying. */
  history?: HistoryEntry[];
  /** Setter to update in-memory history after prepending the snapshot. */
  setHistory?: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void;
  /** Called with the updated direction after a successful edit. */
  setDirection?: (dir: unknown) => void;
  /** Opens the map picker when Ask classifies a location-pin request. */
  openLocationPicker?: (prefill: string) => void;
};

export type UploadImageFlowDeps = {
  /** Fresh file from disk/browse. Mutually exclusive with libraryImagePath. */
  file?: File;
  /** Existing /images/uploads path from the media library. */
  libraryImagePath?: string;
  target: ImageUploadTarget;
  page: Page;
  brief: Brief | null;
  pageFamily: PageFamily | null;
  projectId: string | null;
  /** Version the client is editing from, for optimistic concurrency. */
  serverVersion?: number;
  /** Records the version the server stored this edit as. */
  setServerVersion?: (version: number) => void;
  /** Creative direction carried onto the saved version. */
  direction?: unknown;
  enrichedChatText: string;
  appendMessage: AppendMessage;
  setPage: (page: Page) => void;
  setProjectId: (id: string) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPhase: (phase: ChatPhase) => void;
  setError: (error: string | null) => void;
};

/**
 * Ask agent path: answer / propose; may hand off to Editor on clear edits.
 */
export async function runAskThenEditFlow(deps: RunEditFlowDeps): Promise<void> {
  const {
    instruction,
    page,
    brief,
    pageFamily,
    useFixture,
    appendMessage,
    setPhase,
    setPendingEditInstruction,
  } = deps;

  const family = pageFamily ?? "premium";

  if (deps.skipAsk) {
    await runEditFlow(deps);
    return;
  }

  setPhase("editing");
  appendMessage({
    role: "agent",
    content: "**Ask** reviewing your request…",
    stageName: "Ask",
    stageStatus: "running",
    stageDetail: "Checking whether to answer or apply an edit…",
  });

  const ask = await performAsk({
    instruction,
    page,
    brief,
    family,
    useFixture,
  });

  if (ask.openLocationPicker) {
    deps.setMessages((current) =>
      applyStageToMessages(current, {
        name: "Ask",
        status: "done",
        message: "Opening map picker",
        detail: "Location pin requested",
        ms: 0,
      }),
    );
    const prefill = parseLocationPickerIntent(instruction)?.prefill ?? "";
    deps.openLocationPicker?.(prefill);
    setPhase("editing");
    return;
  }

  if (ask.intent === "edit") {
    // Mark Ask done, then Editor applies immediately.
    deps.setMessages((current) =>
      applyStageToMessages(current, {
        name: "Ask",
        status: "done",
        message: "Handing off to Editor",
        detail: ask.specialist
          ? `${ask.specialist} change detected`
          : "Clear edit intent",
        ms: 0,
      }),
    );
    await runEditFlow({
      ...deps,
      instruction: ask.proposedEdit?.trim() || instruction,
      specialist: ask.specialist,
      skipAsk: true,
    });
    return;
  }

  setPendingEditInstruction?.(ask.proposedEdit);
  const askMessage: ChatMessage = {
    id: createMessageId(),
    role: "assistant",
    content: ask.message || "How can I help with your page?",
    timestamp: Date.now(),
    pageFamily: family,
    actions: ask.proposedEdit
      ? [
          { label: "Apply with Editor", action: "apply_edit", variant: "primary" },
          { label: "Not now", action: "dismiss_edit", variant: "outline" },
        ]
      : undefined,
  };

  deps.setMessages((current) => {
    const next = completeStageAndAppend(
      current,
      {
        name: "Ask",
        status: "done",
        message: "Suggestion ready",
        detail: ask.specialist ? `${ask.specialist} specialist` : "Answered",
        ms: 0,
      },
      askMessage,
    );
    return next;
  });
  setPhase("editing");
}

/**
 * Runs a chat edit: show Editor working → apply → mark done → success CTAs.
 * Pushes an undo history snapshot before applying the new page state.
 */
export async function runEditFlow(deps: RunEditFlowDeps): Promise<void> {
  const {
    instruction,
    ops,
    targetSection,
    targetField,
    direction,
    history,
    page,
    brief,
    pageFamily,
    projectId,
    serverVersion,
    enrichedChatText,
    useFixture,
    appendMessage,
    setPage,
    setBrief,
    setPageFamily,
    setProjectId,
    setMessages,
    setPhase,
    specialist,
  } = deps;

  const family = pageFamily ?? "premium";
  const agentName = editorLabelFor(specialist);
  const attached = Boolean(targetSection);

  setPhase("editing");
  appendMessage({
    role: "agent",
    content: attached
      ? `**${agentName}** reading the attached element…`
      : `**${agentName}** applying your changes…`,
    stageName: agentName,
    stageStatus: "running",
    stageDetail: attached
      ? "Understanding what you want, then applying it to the pick…"
      : "Applying your edits to the live page…",
  });

  try {
    const result = await performPageEdit({
      instruction,
      ops,
      targetSection,
      targetField,
      direction,
      page,
      brief,
      family,
      useFixture,
      // With a project id the server loads the page itself and appends a
      // version; expectedVersion is what makes a concurrent tab a clean 409
      // rather than a silent overwrite.
      projectId,
      expectedVersion: serverVersion,
    });

    // Build the next history (snapshot taken BEFORE applying new state).
    const snapshot: HistoryEntry = {
      page,
      brief,
      family,
      direction,
      summary: instruction || targetSection || "panel edit",
      at: Date.now(),
    };
    const nextHistory = [...(history ?? []), snapshot].slice(-20);

    setPage(result.page);
    setBrief(result.brief);
    setPageFamily(result.family);
    if (typeof result.version === "number") {
      deps.setServerVersion?.(result.version);
    }
    // Update in-memory history and direction.
    deps.setHistory?.(() => nextHistory);
    if (result.direction !== undefined) {
      deps.setDirection?.(result.direction);
    }

    const activeId = ensureProjectId(projectId);
    setProjectId(activeId);
    syncPreviewPayload({
      page: result.page,
      family: result.family,
      businessName: result.brief.businessName,
      projectId: activeId,
    });

    const editMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: result.message,
      timestamp: Date.now(),
      pageFamily: result.family,
      actions: [
        { label: "Open preview ↗", action: "preview", variant: "primary" },
        { label: "Build another", action: "reset", variant: "outline" },
      ],
    };

    setMessages((current) => {
      const nextMessages = completeStageAndAppend(
        current,
        {
          name: agentName,
          status: "done",
          message: "Edits applied",
          detail: "Live preview updated",
          ms: 0,
        },
        editMessage,
      );
      persistProjectState({
        id: activeId,
        nextMessages,
        nextPhase: "editing",
        nextBrief: result.brief,
        nextPage: result.page,
        nextFamily: result.family,
        nextEnriched: enrichedChatText,
        nextDirection: result.direction,
        nextHistory,
        serverVersion: result.version,
      });
      return nextMessages;
    });
    setPhase("editing");
  } catch (err) {
    deps.updateStageMessage({
      name: agentName,
      status: "error",
      message: err instanceof Error ? err.message : "Edit failed",
      detail: "Could not apply that change",
    });
    throw err;
  }
}

/**
 * Runs a media upload: show Uploader working → upload → mark done → success CTAs.
 * On failure, marks the stage error and appends an error message (no Open preview).
 */
export async function runUploadImageFlow(
  deps: UploadImageFlowDeps,
): Promise<void> {
  const {
    file,
    libraryImagePath,
    target,
    page,
    brief,
    pageFamily,
    projectId,
    serverVersion,
    direction,
    enrichedChatText,
    appendMessage,
    setPage,
    setProjectId,
    setMessages,
    setPhase,
    setError,
  } = deps;

  if (!file && !libraryImagePath) {
    throw new Error("Nothing to upload — pick a file or library item.");
  }

  setError(null);
  setPhase("editing");

  const label = formatUploadTargetLabel(target);
  const kindGuess = file
    ? isVideoFile(file)
      ? "video"
      : "image"
    : /\.(mp4|webm|mov|ogg)(?:\?|#|$)/i.test(libraryImagePath ?? "")
      ? "video"
      : "image";
  const fromLibrary = Boolean(libraryImagePath && !file);
  appendMessage({
    role: "user",
    content: fromLibrary
      ? `Use library ${kindGuess} → ${label}`
      : `Upload ${kindGuess} → ${label}`,
  });
  appendMessage({
    role: "agent",
    content: fromLibrary
      ? `Applying library ${kindGuess} to **${label}**…`
      : `Uploading ${kindGuess} to **${label}**…`,
    stageName: "Media Uploader",
    stageStatus: "running",
    stageDetail: fromLibrary
      ? `Applying ${kindGuess} to ${label}…`
      : `Uploading ${kindGuess} to ${label}…`,
  });

  try {
    const result = file
      ? await uploadSectionImage({ file, page, target })
      : await applyLibraryMedia({
          imagePath: libraryImagePath!,
          page,
          target,
        });

    // The upload endpoint returns a modified page but stores nothing, so this
    // change has to be committed as a version explicitly. Without it the new
    // image lives only in the local cache and vanishes on the next reload,
    // when the server's copy of the page is fetched back.
    let uploadedVersion = serverVersion;
    if (projectId) {
      const saved = await saveServerVersion({
        projectId,
        page: result.page,
        brief,
        direction,
        pageFamily: pageFamily ?? "premium",
        summary: `Updated ${label}`,
        expectedVersion: serverVersion ?? 0,
        idempotencyKey: newIntentKey(),
      });
      uploadedVersion = saved.version;
      deps.setServerVersion?.(saved.version);
    }
    setPage(result.page);

    const activeId = ensureProjectId(projectId);
    setProjectId(activeId);
    syncPreviewPayload({
      page: result.page,
      family: pageFamily ?? "premium",
      businessName: brief?.businessName ?? "Untitled",
      projectId: activeId,
    });

    const noun = result.mediaKind === "video" ? "video" : "photo";
    const successMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: `Replaced **${label}** with your ${noun}.\n\nLive preview updated — attach another image or video anytime from the chat box.`,
      timestamp: Date.now(),
      pageFamily: pageFamily ?? undefined,
      actions: [
        { label: "Open preview ↗", action: "preview", variant: "primary" },
      ],
    };

    setMessages((current) => {
      const nextMessages = completeStageAndAppend(
        current,
        {
          name: "Media Uploader",
          status: "done",
          message: `Updated ${label}`,
          detail: `Replaced ${label} with your ${noun}`,
          ms: 0,
        },
        successMessage,
      );
      persistProjectState({
        id: activeId,
        nextMessages,
        nextPhase: "editing",
        nextBrief: brief,
        nextPage: result.page,
        nextFamily: pageFamily,
        nextEnriched: enrichedChatText,
        serverVersion: uploadedVersion,
      });
      return nextMessages;
    });
    setPhase("editing");
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Upload failed";
    setError(detail);
    setMessages((current) => {
      const withError = applyStageToMessages(current, {
        name: "Media Uploader",
        status: "error",
        message: detail,
        detail: "Upload failed",
      });
      return [
        ...withError,
        {
          id: createMessageId(),
          role: "assistant",
          content: `Could not upload that media: ${detail}`,
          timestamp: Date.now(),
        },
      ];
    });
  }
}
