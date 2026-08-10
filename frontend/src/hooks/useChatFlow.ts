import { useCallback, useState } from "react";
import {
  createMessageId,
  createWelcomeMessage,
  formatBriefSummary,
  formatClarificationMessage,
} from "@/lib/chatFormatters";
import { runConfirmBuild } from "@/lib/confirmBuildFlow";
import {
  runEditFlow,
  runUploadImageFlow,
} from "@/lib/editUploadFlows";
import {
  createEmptyChatSession,
  loadChatSession,
} from "@/lib/chatSession";
import {
  applyStageToMessages,
  createBuildStageRosterMessages,
} from "@/lib/stageMessageUpdates";
import type { ImageUploadTarget } from "@/lib/uploadSectionImage";
import type { PageFamily } from "@/lib/pageFamily";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief, IntakeResponse, PipelineStage } from "@/types/intake";
import type { Page } from "@/types/page";

export { handleChatAction } from "@/lib/chatActions";

const EDITABLE_PHASES: ChatPhase[] = ["complete", "editing"];
type UseChatFlowOptions = { useFixture: boolean };

/**
 * Manages the conversational intake → clarify → build → edit flow.
 */
export function useChatFlow({ useFixture: initialFixture }: UseChatFlowOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(),
  ]);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [useFixture, setUseFixture] = useState(initialFixture);
  const [enrichedChatText, setEnrichedChatText] = useState("");
  const [clarificationRound, setClarificationRound] = useState(0);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [pageFamily, setPageFamily] = useState<PageFamily | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  /**
   * Appends a message to the chat thread.
   */
  const appendMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "timestamp">) => {
      setMessages((current) => [
        ...current,
        { ...message, id: createMessageId(), timestamp: Date.now() },
      ]);
    },
    [],
  );

  /**
   * Upserts a pipeline stage status message in the chat thread.
   */
  const updateStageMessage = useCallback((stage: PipelineStage) => {
    setMessages((current) => applyStageToMessages(current, stage));
  }, []);

  /**
   * Appends a fresh build-team stage roster after the pipeline kickoff message.
   */
  const seedBuildStageRoster = useCallback(() => {
    setMessages((current) => [
      ...current,
      ...createBuildStageRosterMessages(),
    ]);
  }, []);

  /**
   * Calls the intake API and handles clarification or ready states.
   */
  const runIntake = useCallback(
    async (chatText: string, round: number) => {
      const query = useFixture ? "?fixture=1" : "";
      const response = await fetch(`/api/intake${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatText, clarificationRound: round }),
      });

      const data = (await response.json()) as IntakeResponse & {
        pageFamily?: PageFamily;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "Intake failed." : data.error);
      }

      setEnrichedChatText(data.enrichedChatText);
      setClarificationRound(data.clarificationRound);

      updateStageMessage({
        name: "Brief Extractor",
        status: "done",
        ms: 0,
      });

      if (data.status === "unsupported") {
        appendMessage({
          role: "assistant",
          content: data.message,
          actions: [
            { label: "Try a restaurant", action: "reset", variant: "primary" },
          ],
        });
        setBrief(null);
        setPageFamily(null);
        setPhase("idle");
        return;
      }

      const family = data.pageFamily ?? "premium";
      setPageFamily(family);

      if (data.status === "needs_clarification") {
        const canSkip = data.canSkip === true;
        appendMessage({
          role: "assistant",
          content: formatClarificationMessage(
            data.questions,
            data.clarificationRound,
            canSkip,
          ),
          questions: data.questions,
          actions: canSkip
            ? [
                {
                  label: "Skip for now",
                  action: "skip",
                  variant: "outline",
                },
              ]
            : undefined,
        });
        setPhase("clarifying");
        return;
      }

      setBrief(data.brief);
      appendMessage({
        role: "assistant",
        content: formatBriefSummary(data.brief, family),
        brief: data.brief,
        pageFamily: family,
        actions: [
          { label: "Build page", action: "build", variant: "primary" },
          { label: "Start over", action: "reset", variant: "outline" },
        ],
      });
      setPhase("confirm");
    },
    [appendMessage, updateStageMessage, useFixture],
  );

  /**
   * Applies a post-preview edit instruction against the current page.
   */
  const runEdit = useCallback(
    async (instruction: string) => {
      if (!page || !brief) {
        throw new Error("No built page available to edit.");
      }
      await runEditFlow({
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
      });
    },
    [
      appendMessage,
      brief,
      enrichedChatText,
      page,
      pageFamily,
      projectId,
      updateStageMessage,
      useFixture,
    ],
  );

  /**
   * Uploads a user image or video into a hero/about/gallery slot from chat input.
   */
  const uploadImage = useCallback(
    async (file: File, target: ImageUploadTarget) => {
      if (!page || isBusy) return;
      setIsBusy(true);
      try {
        await runUploadImageFlow({
          file,
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
        });
      } finally {
        setIsBusy(false);
      }
    },
    [
      appendMessage,
      brief,
      enrichedChatText,
      isBusy,
      page,
      pageFamily,
      projectId,
    ],
  );

  /**
   * Applies an existing library media path to a section slot.
   */
  const applyLibraryMedia = useCallback(
    async (imagePath: string, target: ImageUploadTarget) => {
      if (!page || isBusy) return;
      setIsBusy(true);
      try {
        await runUploadImageFlow({
          libraryImagePath: imagePath,
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
        });
      } finally {
        setIsBusy(false);
      }
    },
    [
      appendMessage,
      brief,
      enrichedChatText,
      isBusy,
      page,
      pageFamily,
      projectId,
    ],
  );

  /**
   * Sends a user message and triggers intake, clarification, or page edit.
   */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;

      setError(null);
      appendMessage({ role: "user", content: trimmed });
      setIsBusy(true);

      try {
        if (page && EDITABLE_PHASES.includes(phase)) {
          await runEdit(trimmed);
          return;
        }

        setPhase("analyzing");
        updateStageMessage({ name: "Brief Extractor", status: "running" });

        if (phase === "clarifying" && enrichedChatText) {
          const combined = `${enrichedChatText}\n\n${trimmed}`;
          await runIntake(combined, clarificationRound);
        } else if (phase === "confirm" && enrichedChatText) {
          const combined = `${enrichedChatText}\n\nUpdate: ${trimmed}`;
          await runIntake(combined, 0);
        } else {
          setEnrichedChatText(trimmed);
          await runIntake(trimmed, 0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        if (page && EDITABLE_PHASES.includes(phase)) {
          appendMessage({
            role: "assistant",
            content:
              "Could not apply that edit. Try rephrasing (headline, price, remove menu item, different image, use premium theme).",
          });
          setPhase("editing");
        } else {
          appendMessage({
            role: "assistant",
            content:
              "Something went wrong analyzing your brief. Please try again.",
          });
          setPhase("idle");
        }
      } finally {
        setIsBusy(false);
      }
    },
    [
      appendMessage,
      clarificationRound,
      enrichedChatText,
      isBusy,
      page,
      phase,
      runEdit,
      runIntake,
      updateStageMessage,
    ],
  );

  /**
   * Runs the confirmed build pipeline with streaming stage updates.
   */
  const confirmBuild = useCallback(async () => {
    if (!brief || isBusy) return;

    setIsBusy(true);
    setError(null);
    try {
      await runConfirmBuild({
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
      });
    } finally {
      setIsBusy(false);
    }
  }, [
    appendMessage,
    brief,
    enrichedChatText,
    isBusy,
    pageFamily,
    projectId,
    seedBuildStageRoster,
    updateStageMessage,
    useFixture,
  ]);

  /**
   * Resets the chat to its initial empty state and clears the active project pointer.
   */
  const resetChat = useCallback(() => {
    const empty = createEmptyChatSession();
    setMessages(empty.messages);
    setPhase(empty.phase);
    setError(null);
    setEnrichedChatText(empty.enrichedChatText);
    setClarificationRound(0);
    setBrief(empty.brief);
    setPageFamily(empty.pageFamily);
    setPage(empty.page);
    setProjectId(empty.projectId);
  }, []);

  /**
   * Restores a previously saved project into the chat/preview state.
   */
  const restoreProject = useCallback((id: string): boolean => {
    const session = loadChatSession(id);
    if (!session) return false;

    setProjectId(session.projectId);
    setMessages(session.messages);
    setPhase(session.phase);
    setBrief(session.brief);
    setPage(session.page);
    setPageFamily(session.pageFamily);
    setEnrichedChatText(session.enrichedChatText);
    setError(null);
    setClarificationRound(0);
    setIsBusy(false);
    return true;
  }, []);

  return {
    messages,
    phase,
    error,
    isBusy,
    useFixture,
    setUseFixture,
    sendMessage,
    uploadImage,
    applyLibraryMedia,
    confirmBuild,
    resetChat,
    page,
    pageFamily,
    brief,
    projectId,
    restoreProject,
  };
}
