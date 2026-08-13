import { useCallback, useState } from "react";
import {
  createMessageId,
  createWelcomeMessage,
  formatBriefSummary,
  formatClarificationMessage,
} from "@/lib/chatFormatters";
import { runConfirmBuild } from "@/lib/confirmBuildFlow";
import {
  runAskThenEditFlow,
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
import type { HistoryEntry } from "@/lib/projectStorage";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief, IntakeResponse, PipelineStage } from "@/types/intake";
import type { Page, SectionType } from "@/types/page";

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
  /** Last clarification questions — used to send structured answers on reply. */
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [pageFamily, setPageFamily] = useState<PageFamily | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  /** Pending Ask → Editor proposal instruction. */
  const [pendingEditInstruction, setPendingEditInstruction] = useState<
    string | null
  >(null);
  const [selectedSectionType, setSelectedSectionType] =
    useState<SectionType | null>(null);
  const [direction, setDirection] = useState<unknown>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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
    async (
      chatText: string,
      round: number,
      answers?: Record<string, string>,
    ) => {
      const query = useFixture ? "?fixture=1" : "";
      const response = await fetch(`/api/intake${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatText,
          clarificationRound: round,
          ...(answers && Object.keys(answers).length > 0 ? { answers } : {}),
        }),
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
        setPendingQuestions([]);
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
        setPendingQuestions(data.questions);
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

      setPendingQuestions([]);
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
   * Routes post-build chat through Ask → (confirm) → Editor.
   */
  const runEdit = useCallback(
    async (instruction: string, options?: { skipAsk?: boolean }) => {
      if (!page || !brief) {
        throw new Error("No built page available to edit.");
      }
      const deps = {
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
        setPendingEditInstruction,
        skipAsk: options?.skipAsk,
        targetSection: selectedSectionType ?? undefined,
        direction,
        history,
        setHistory,
        setDirection,
      };
      if (options?.skipAsk) {
        await runEditFlow(deps);
        return;
      }
      await runAskThenEditFlow(deps);
    },
    [
      appendMessage,
      brief,
      direction,
      enrichedChatText,
      history,
      page,
      pageFamily,
      projectId,
      selectedSectionType,
      updateStageMessage,
      useFixture,
    ],
  );

  /**
   * Applies deterministic ops from the section action panel.
   */
  const applySectionOps = useCallback(
    async (ops: Array<Record<string, unknown>>) => {
      if (!page || !brief || ops.length === 0) return;
      setIsBusy(true);
      setError(null);
      try {
        await runEditFlow({
          instruction: "",
          ops,
          targetSection: selectedSectionType ?? undefined,
          direction,
          history,
          setHistory,
          setDirection,
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
          skipAsk: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not apply edit");
      } finally {
        setIsBusy(false);
      }
    },
    [
      appendMessage,
      brief,
      direction,
      enrichedChatText,
      history,
      page,
      pageFamily,
      projectId,
      selectedSectionType,
      updateStageMessage,
      useFixture,
    ],
  );

  /**
   * Restores the previous page snapshot from edit history.
   */
  const undoEdit = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setPage(previous.page as Page);
    setBrief(previous.brief as Brief);
    setPageFamily(previous.family as PageFamily);
    if (previous.direction !== undefined) setDirection(previous.direction);
    appendMessage({
      role: "assistant",
      content: `Undid: ${previous.summary}`,
    });
  }, [appendMessage, history]);

  /**
   * Applies a pending Ask proposal via the Editor.
   */
  const applyPendingEdit = useCallback(async () => {
    const instruction = pendingEditInstruction?.trim();
    if (!instruction) return;
    setPendingEditInstruction(null);
    setIsBusy(true);
    setError(null);
    try {
      await runEdit(instruction, { skipAsk: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply edit");
    } finally {
      setIsBusy(false);
    }
  }, [pendingEditInstruction, runEdit]);

  /**
   * Dismisses a pending Ask proposal without editing.
   */
  const dismissPendingEdit = useCallback(() => {
    setPendingEditInstruction(null);
    appendMessage({
      role: "assistant",
      content: "Okay — no changes applied. Ask anytime or request a different edit.",
    });
  }, [appendMessage]);

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
          // Confirm Ask proposal via typed "yes" / "switch it" (not re-parse confirm text)
          const isConfirmUtterance =
            /^(yes|yeah|yep|yup|confirm|do it|switch it|go ahead|apply|ok|okay)(\s|[!.]|$)/i.test(
              trimmed,
            );
          if (isConfirmUtterance && pendingEditInstruction?.trim()) {
            const pending = pendingEditInstruction.trim();
            setPendingEditInstruction(null);
            await runEdit(pending, { skipAsk: true });
            return;
          }
          await runEdit(trimmed);
          return;
        }

        setPhase("analyzing");
        updateStageMessage({ name: "Brief Extractor", status: "running" });

        if (phase === "clarifying" && enrichedChatText) {
          const answers =
            pendingQuestions.length > 0
              ? Object.fromEntries(
                  pendingQuestions.map((question) => [question, trimmed]),
                )
              : undefined;
          // Keep original dump; mergeClarificationAnswers appends answers server-side.
          await runIntake(enrichedChatText, clarificationRound, answers);
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
              "Could not apply that edit. Try rephrasing (headline, price, remove menu item, different image).",
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
      pendingEditInstruction,
      pendingQuestions,
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
        clearHistory: () => setHistory([]),
        setDirection,
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
    setPendingQuestions([]);
    setBrief(empty.brief);
    setPageFamily(empty.pageFamily);
    setPage(empty.page);
    setProjectId(empty.projectId);
    setHistory([]);
    setDirection(null);
    setSelectedSectionType(null);
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
    setHistory(session.history ?? []);
    setDirection(session.direction ?? null);
    setSelectedSectionType(null);
    setError(null);
    setClarificationRound(0);
    setPendingQuestions([]);
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
    applyPendingEdit,
    dismissPendingEdit,
    pendingEditInstruction,
    selectedSectionType,
    setSelectedSectionType,
    applySectionOps,
    undoEdit,
    canUndo: history.length > 0,
    direction,
  };
}
