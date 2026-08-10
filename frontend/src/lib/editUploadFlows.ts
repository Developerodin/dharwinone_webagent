import type { Dispatch, SetStateAction } from "react";
import { createMessageId } from "@/lib/chatFormatters";
import { performPageEdit } from "@/lib/performPageEdit";
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
import type { Page } from "@/types/page";

type AppendMessage = (message: Omit<ChatMessage, "id" | "timestamp">) => void;

export type RunEditFlowDeps = {
  instruction: string;
  page: Page;
  brief: Brief;
  pageFamily: PageFamily | null;
  projectId: string | null;
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
  enrichedChatText: string;
  appendMessage: AppendMessage;
  setPage: (page: Page) => void;
  setProjectId: (id: string) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPhase: (phase: ChatPhase) => void;
  setError: (error: string | null) => void;
};

/**
 * Runs a chat edit: show Editor working → apply → mark done → success CTAs.
 */
export async function runEditFlow(deps: RunEditFlowDeps): Promise<void> {
  const {
    instruction,
    page,
    brief,
    pageFamily,
    projectId,
    enrichedChatText,
    useFixture,
    appendMessage,
    updateStageMessage,
    setPage,
    setBrief,
    setPageFamily,
    setProjectId,
    setMessages,
    setPhase,
  } = deps;

  setPhase("editing");
  appendMessage({
    role: "agent",
    content: "**Editor** applying your changes…",
    stageName: "Editor",
    stageStatus: "running",
    stageDetail: "Applying your edits to the live page…",
  });

  try {
    const result = await performPageEdit({
      instruction,
      page,
      brief,
      family: pageFamily ?? "premium",
      useFixture,
    });

    setPage(result.page);
    setBrief(result.brief);
    setPageFamily(result.family);

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
          name: "Editor",
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
      });
      return nextMessages;
    });
    setPhase("editing");
  } catch (err) {
    updateStageMessage({
      name: "Editor",
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
