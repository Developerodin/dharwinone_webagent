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
import { formatLocationDumpLine } from "@/lib/locationPickerIntent";
import { buildIntakeClarificationActions } from "@/lib/intakeClarificationActions";
import type { PickedLocation } from "@/lib/mapsApi";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief, IntakeResponse, PipelineStage } from "@/types/intake";
import type { Page, SectionType } from "@/types/page";
import {
  formatAttachedEditInstruction,
  looksLikeQuestion,
  sectionOnlyPick,
  type PreviewPick,
} from "@/lib/resolvePreviewPick";
import { getAccessToken } from "@/lib/apiClient";
import {
  loadServerProject,
  newIntentKey,
  revertServerProject,
} from "@/lib/projectApi";

/**
 * Headers for a JSON request to an authenticated pipeline route.
 *
 * /api/intake requires a session now — it runs the brief-assessment LLM call,
 * and an ungated LLM endpoint is someone else's bill.
 */
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAccessToken() ?? ""}`,
  };
}


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
  /**
   * Version of the stored document this session is editing from.
   *
   * Sent as `expectedVersion` on every edit, so a change made in another tab
   * is rejected with a conflict rather than silently overwritten.
   */
  const [serverVersion, setServerVersion] = useState(0);
  /** Pending Ask → Editor proposal instruction. */
  const [pendingEditInstruction, setPendingEditInstruction] = useState<
    string | null
  >(null);
  const [selectedPick, setSelectedPick] = useState<PreviewPick | null>(null);
  const selectedSectionType = selectedPick?.section ?? null;
  /**
   * Clears or sets a section-only pick (action panel / Esc). Keeps a field
   * pick when the same section is re-asserted.
   */
  const setSelectedSectionType = useCallback((type: SectionType | null) => {
    if (!type) {
      setSelectedPick(null);
      return;
    }
    setSelectedPick((prev) =>
      prev?.section === type ? prev : sectionOnlyPick(type),
    );
  }, []);
  const [direction, setDirection] = useState<unknown>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [locationPicker, setLocationPicker] = useState<{
    open: boolean;
    prefill: string;
  }>({ open: false, prefill: "" });

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
   * Opens the map picker and posts a Select location chat control.
   */
  const promptLocationPicker = useCallback(
    (prefill: string) => {
      setLocationPicker({ open: true, prefill });
      appendMessage({
        role: "assistant",
        content:
          "Pick the place on the map, or tap Select location if you closed the picker.",
        actions: [
          {
            label: "Select location",
            action: "open_location_picker",
            variant: "primary",
            ariaLabel: "Select location on Google Maps",
          },
        ],
      });
    },
    [appendMessage],
  );

  /**
   * Reopens the map picker using the last prefill (chat button).
   */
  const openLocationPicker = useCallback(() => {
    setLocationPicker((current) => ({
      open: true,
      prefill: current.prefill,
    }));
  }, []);

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
        headers: authHeaders(),
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
        const gaps = data.gaps ?? [];
        setPendingQuestions(data.questions);
        setLocationPicker({
          open: false,
          prefill: data.partialBrief.address?.trim() ?? "",
        });
        appendMessage({
          role: "assistant",
          content: formatClarificationMessage(
            data.questions,
            data.clarificationRound,
            canSkip,
          ),
          questions: data.questions,
          actions: buildIntakeClarificationActions({ canSkip, gaps }),
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
      const pick = selectedPick;
      const scopedInstruction = pick
        ? formatAttachedEditInstruction(pick, instruction)
        : instruction;
      const skipAskForPick = Boolean(pick) && !looksLikeQuestion(instruction);
      const deps = {
        instruction: scopedInstruction,
        page,
        brief,
        pageFamily,
        projectId,
      serverVersion,
      setServerVersion,
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
        skipAsk: Boolean(options?.skipAsk) || skipAskForPick,
        targetSection: pick?.section ?? selectedSectionType ?? undefined,
        targetField: pick?.field,
        direction,
        history,
        setHistory,
        setDirection,
        openLocationPicker: promptLocationPicker,
      };
      if (options?.skipAsk || skipAskForPick) {
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
      serverVersion,
      setServerVersion,
      promptLocationPicker,
      selectedPick,
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
          targetField: selectedPick?.field,
          direction,
          history,
          setHistory,
          setDirection,
          page,
          brief,
          pageFamily,
          projectId,
      serverVersion,
      setServerVersion,
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
      serverVersion,
      setServerVersion,
      selectedPick,
      selectedSectionType,
      updateStageMessage,
      useFixture,
    ],
  );

  /**
   * Undoes the last edit by reverting the stored document.
   *
   * Reverting server-side rather than popping an in-memory stack: a local undo
   * was invisible to the server, so a refresh brought the undone edit back and
   * the next edit still carried the pre-undo version — leaving the user unable
   * to save the state they had just asked for.
   *
   * The revert appends a new version rather than deleting one, so the undone
   * edit is still in history and can be re-applied.
   */
  const undoEdit = useCallback(async () => {
    if (!projectId || serverVersion < 2) return;

    const target = serverVersion - 1;
    setIsBusy(true);

    try {
      const result = await revertServerProject({
        projectId,
        toVersion: target,
        expectedVersion: serverVersion,
        idempotencyKey: newIntentKey(),
      });

      const restored = await loadServerProject(projectId);
      if (restored.page) setPage(restored.page);
      setServerVersion(result.version);
      setHistory((current) => current.slice(0, -1));

      appendMessage({
        role: "assistant",
        content: `Undid the last change — back to version ${target}.`,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not undo that change.",
      );
    } finally {
      setIsBusy(false);
    }
  }, [appendMessage, projectId, serverVersion]);

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
      serverVersion,
      setServerVersion,
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
      serverVersion,
      setServerVersion,
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
      serverVersion,
      setServerVersion,
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
      serverVersion,
      setServerVersion,
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
   * Applies a confirmed map pin: edit op when a page exists, otherwise intake dump.
   */
  const confirmPickedLocation = useCallback(
    async (location: PickedLocation) => {
      setLocationPicker({ open: false, prefill: "" });
      const dumpLine = formatLocationDumpLine(location);

      if (page && brief && EDITABLE_PHASES.includes(phase)) {
        setIsBusy(true);
        setError(null);
        try {
          await runEditFlow({
            instruction: `Update location to ${location.address}`,
            ops: [
              {
                op: "set_location",
                address: location.address,
                lat: location.lat,
                lng: location.lng,
                placeId: location.placeId,
                mapsUrl: location.mapsUrl,
              },
            ],
            targetSection: "location_map",
            direction,
            history,
            setHistory,
            setDirection,
            page,
            brief,
            pageFamily,
            projectId,
      serverVersion,
      setServerVersion,
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
          setError(err instanceof Error ? err.message : "Could not save location");
          appendMessage({
            role: "assistant",
            content: "Could not save that location. Try picking it again.",
          });
        } finally {
          setIsBusy(false);
        }
        return;
      }

      const combined = enrichedChatText
        ? `${enrichedChatText}\n\n${dumpLine}`
        : dumpLine;
      setIsBusy(true);
      setError(null);
      try {
        setPhase("analyzing");
        updateStageMessage({ name: "Brief Extractor", status: "running" });
        setEnrichedChatText(combined);
        await runIntake(combined, phase === "clarifying" ? clarificationRound : 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        appendMessage({
          role: "assistant",
          content: "Saved the pin locally but intake failed. Try sending again.",
        });
      } finally {
        setIsBusy(false);
      }
    },
    [
      appendMessage,
      brief,
      clarificationRound,
      direction,
      enrichedChatText,
      history,
      page,
      pageFamily,
      phase,
      projectId,
      serverVersion,
      setServerVersion,
      runIntake,
      updateStageMessage,
      useFixture,
    ],
  );

  /**
   * Closes the location picker without applying a pin.
   */
  const closeLocationPicker = useCallback(() => {
    setLocationPicker((current) => ({ ...current, open: false }));
  }, []);

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
      serverVersion,
      setServerVersion,
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
    // Without this the next edit carries the previous project's version and
    // conflicts against a document it has nothing to do with.
    setServerVersion(empty.serverVersion ?? 0);
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
    setServerVersion(session.serverVersion ?? 0);
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
    selectedPick,
    setSelectedSectionType,
    setSelectedPick,
    applySectionOps,
    undoEdit,
    canUndo: history.length > 0,
    direction,
    locationPicker,
    confirmPickedLocation,
    closeLocationPicker,
    openLocationPicker,
  };
}
