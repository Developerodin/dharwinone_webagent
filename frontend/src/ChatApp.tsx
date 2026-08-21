import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatInput } from "@/components/ChatInput";
import { ChatThread } from "@/components/ChatThread";
import { LivePreviewPane } from "@/components/LivePreviewPane";
import { DashboardLayout } from "@/components/shell/DashboardLayout";
import { type ProjectFilter } from "@/components/shell/DashboardSidebar";
import {
  EditorTopBar,
  formatLastSaved,
} from "@/components/shell/EditorTopBar";
import { HomeDashboard } from "@/components/shell/HomeDashboard";
import { VersionHistoryPanel } from "@/components/shell/VersionHistoryPanel";
import { AssetsPanel } from "@/components/shell/AssetsPanel";
import { PromptComposer } from "@/components/shell/PromptComposer";
import { ComposerTargetChip } from "@/components/shell/ComposerTargetChip";
import { handleChatAction, useChatFlow } from "@/hooks/useChatFlow";
import { useCanvasTool } from "@/hooks/useCanvasTool";
import { useAppViewSync } from "@/hooks/useAppViewSync";
import { composerPlaceholderForPick } from "@/lib/resolvePreviewPick";
import { publicPreviewUrl, saveAndOpenPreview } from "@/lib/previewStorage";
import {
  listProjects,
  loadProject,
  type StoredProject,
} from "@/lib/projectStorage";
import {
  duplicateProject,
  renameProject,
  trashProject,
  untrashProject,
} from "@/lib/projectActions";
import {
  hydrateProject,
  syncProjectsWithServer,
  toStoredProject,
} from "@/lib/projectSync";
import { listTrashedProjects } from "@/lib/projectApi";
import { BuilderLocationPicker } from "@/components/BuilderLocationPicker";
import { ComponentGalleryPage } from "@/pages/ComponentGalleryPage";

type MobilePane = "chat" | "preview";
type DeviceMode = "desktop" | "tablet" | "mobile";
type EditorViewMode = "preview" | "code" | "assets";

/**
 * Returns true when the ?dev=1 query param is present.
 */
function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("dev") === "1";
}

/**
 * App shell: Lovable-style home dashboard → dark builder workspace.
 */
export function ChatApp() {
  const showDevTools = isDevMode();
  const [projects, setProjects] = useState(() => listProjects());
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [editorViewMode, setEditorViewMode] =
    useState<EditorViewMode>("preview");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trashed, setTrashed] = useState<StoredProject[]>([]);

  // Reconcile with the server once the shell mounts: hand over anything this
  // browser built before sign-in, then replace the cache with what the server
  // actually holds. The cached list renders immediately in the meantime, so
  // there is no empty-dashboard flash while this runs.
  useEffect(() => {
    let cancelled = false;

    void syncProjectsWithServer().then((result) => {
      if (cancelled) return;
      setProjects(result.projects);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const {
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
    serverVersion,
    restoreProject,
    resumeBuild,
    applyPendingEdit,
    dismissPendingEdit,
    selectedSectionType,
    selectedPick,
    setSelectedSectionType,
    setSelectedPick,
    commitInlineCopy,
    undoEdit,
    canUndo,
    locationPicker,
    confirmPickedLocation,
    closeLocationPicker,
    openLocationPicker,
  } = useChatFlow({ useFixture: false });

  const {
    tool: canvasTool,
    textSession,
    textHint,
    toggleSelect,
    toggleText,
    resetCanvasTool,
    startTextEdit,
    cancelTextEdit,
  } = useCanvasTool({
    selectedPick,
    setSelectedPick,
    setSelectedSectionType,
  });

  /**
   * Refreshes the project list from localStorage.
   */
  const refreshProjects = useCallback(() => {
    setProjects(listProjects());
    setSavedAt(Date.now());
  }, []);

  /**
   * Reattaches to a build after the router restores a project.
   *
   * Memoised because the hook keeps it in an effect's dependency list — an
   * inline arrow would resubscribe the hashchange listener on every render.
   */
  const handleProjectRestored = useCallback(
    (id: string) => {
      void resumeBuild(id);
    },
    [resumeBuild],
  );

  const { view, navigateView } = useAppViewSync({
    restoreProject,
    refreshProjects,
    onProjectRestored: handleProjectRestored,
  });

  /**
   * Opens the full-size preview in a new browser tab.
   */
  const openFullPreview = useCallback(() => {
    if (!page || !pageFamily) return;
    saveAndOpenPreview({
      page,
      pageFamily,
      businessName: brief?.businessName,
      projectId: projectId ?? undefined,
    });
  }, [brief?.businessName, page, pageFamily, projectId]);

  const previewPayload =
    page && pageFamily
      ? {
          page,
          pageFamily,
          businessName: brief?.businessName,
          projectId: projectId ?? undefined,
        }
      : null;

  const inputDisabled = isBusy || phase === "building";
  const canUploadImage = Boolean(page);
  const pickPlaceholder = composerPlaceholderForPick(
    selectedPick,
    canvasTool === "select" && Boolean(page),
  );
  const placeholder =
    phase === "clarifying"
      ? "Answer the questions above…"
      : phase === "confirm"
        ? "Or type changes to update the brief…"
        : pickPlaceholder
          ? pickPlaceholder
          : page
            ? "Ask Dharwin to edit the page…"
            : "Ask Dharwin…";

  const projectTitle = brief?.businessName ?? "New project";

  /**
   * Soft-return to the dashboard without wiping the in-memory project session.
   */
  const goHome = useCallback(() => {
    refreshProjects();
    navigateView("home");
    setChatCollapsed(false);
  }, [navigateView, refreshProjects]);

  /**
   * Hard-reset session and return home (Start over / Build another).
   */
  const startFreshHome = useCallback(() => {
    resetChat();
    resetCanvasTool();
    refreshProjects();
    navigateView("home");
    setChatCollapsed(false);
  }, [navigateView, refreshProjects, resetCanvasTool, resetChat]);

  /**
   * Starts a new build from the home dashboard (new session, then intake).
   */
  const startFromHome = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      resetChat();
      resetCanvasTool();
      navigateView("builder");
      setMobilePane("chat");
      setChatCollapsed(false);
      void sendMessage(trimmed);
      refreshProjects();
    },
    [navigateView, refreshProjects, resetCanvasTool, resetChat, sendMessage],
  );

  /**
   * Opens a project in the builder.
   *
   * The dashboard list carries no page or chat history — deliberately, so the
   * list query stays cheap — so both are fetched here before restoring. The
   * cached copy is used first when there is one, which makes reopening a
   * project you were just in feel instant.
   */
  const openProject = useCallback(
    async (id: string) => {
      const enterBuilder = () => {
        navigateView("builder");
        setMobilePane("chat");
        setChatCollapsed(false);
      };

      // Only open immediately when the cache actually holds the document.
      // Navigating on a summary row shows an empty builder, then swaps in the
      // real page a moment later — which reads as the app losing the project.
      const cached = loadProject(id);
      if (cached?.page && restoreProject(id)) enterBuilder();

      const hydrated = await hydrateProject(id);

      if (!hydrated) {
        // Nothing on the server and nothing usable cached: the list is stale.
        if (!cached?.page) refreshProjects();
        return;
      }

      restoreProject(id);
      enterBuilder();
      refreshProjects();

      // A build started in another tab — or before a reload — is still running
      // server-side. Reattaching is what stops that work from looking lost.
      void resumeBuild(id);
    },
    [navigateView, refreshProjects, restoreProject, resumeBuild],
  );

  /**
   * Focuses the home prompt composer (used by sidebar Search).
   */
  function focusHomePrompt() {
    if (view !== "home") {
      navigateView("home");
      window.setTimeout(() => {
        document
          .querySelector<HTMLTextAreaElement>("#prompt textarea")
          ?.focus();
      }, 0);
      return;
    }
    const field = document.querySelector<HTMLTextAreaElement>(
      "#prompt textarea",
    );
    field?.focus();
  }

  const sidebarProjects =
    projectFilter === "trash"
      ? trashed
      : projectFilter === "starred" || projectFilter === "shared"
        ? []
        : projects;

  /**
   * Renames a project on the server, then refreshes the list.
   */
  const handleRenameProject = useCallback(
    async (id: string, name: string) => {
      await renameProject(id, name);
      refreshProjects();
    },
    [refreshProjects],
  );

  /**
   * Copies a project and refreshes the list so the copy appears.
   */
  const handleDuplicateProject = useCallback(
    async (id: string) => {
      await duplicateProject(id);
      refreshProjects();
    },
    [refreshProjects],
  );

  /**
   * Moves a project to the trash.
   *
   * Deleting the project that is currently open would leave the builder
   * showing a document that no longer exists, so that case returns home.
   */
  const handleDeleteProject = useCallback(
    async (id: string) => {
      await trashProject(id);
      if (projectId === id) {
        resetChat();
        navigateView("home");
      }
      refreshProjects();
    },
    [navigateView, projectId, refreshProjects, resetChat],
  );

  /**
   * Reloads the builder after a version restore.
   *
   * The restore happens server-side, so the local copy is a version behind
   * until it is refetched — showing the old page with the new version number
   * would make the next edit conflict for no visible reason.
   */
  const handleReverted = useCallback(async () => {
    if (!projectId) return;
    await hydrateProject(projectId);
    restoreProject(projectId);
    refreshProjects();
  }, [projectId, refreshProjects, restoreProject]);

  /**
   * Loads the trash when that filter is opened.
   *
   * Fetched on demand rather than kept in sync: deleted projects are a rare
   * detour, and paying for them on every dashboard render would be waste.
   */
  const loadTrash = useCallback(async () => {
    try {
      setTrashed((await listTrashedProjects()).map(toStoredProject));
    } catch {
      setTrashed([]);
    }
  }, []);

  useEffect(() => {
    if (projectFilter === "trash") void loadTrash();
  }, [loadTrash, projectFilter]);

  /**
   * Restores a project from the trash and returns it to the live list.
   */
  const handleRestoreProject = useCallback(
    async (id: string) => {
      await untrashProject(id);
      await loadTrash();
      const result = await syncProjectsWithServer();
      setProjects(result.projects);
    },
    [loadTrash],
  );

  const workspaceNav = {
    projects: sidebarProjects,
    activeFilter: projectFilter,
    onFilterChange: setProjectFilter,
    onSelectProject: openProject,
    onGoDashboard: goHome,
    activeView: (view === "gallery" ? "gallery" : "home") as
      | "home"
      | "gallery",
    activeProjectId: projectId,
    onSearch: focusHomePrompt,
    onRenameProject: handleRenameProject,
    onDuplicateProject: handleDuplicateProject,
    onDeleteProject: handleDeleteProject,
    onRestoreProject: handleRestoreProject,
    trashView: projectFilter === "trash",
  };

  if (view === "home" || view === "gallery") {
    return (
      <DashboardLayout
        mobileNavOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        {...workspaceNav}
      >
        {view === "gallery" ? (
          <ComponentGalleryPage
            onOpenMenu={() => setMobileNavOpen(true)}
          />
        ) : (
          <HomeDashboard
            onStartBuild={startFromHome}
            disabled={isBusy}
            onOpenMenu={() => setMobileNavOpen(true)}
          />
        )}
      </DashboardLayout>
    );
  }

  return (
    <div className="builder-shell flex h-svh min-w-0 flex-col overflow-hidden font-sans">
      <EditorTopBar
        projectTitle={projectTitle}
        lastSavedLabel={formatLastSaved(savedAt)}
        pageLabel="Homepage"
        viewMode={editorViewMode}
        onViewModeChange={setEditorViewMode}
        deviceMode={deviceMode}
        onDeviceModeChange={setDeviceMode}
        mobilePane={mobilePane}
        onMobilePaneChange={setMobilePane}
        chatCollapsed={chatCollapsed}
        onToggleChat={() => setChatCollapsed((current) => !current)}
        onOpenPreview={openFullPreview}
        canOpenPreview={Boolean(page)}
        previewShareUrl={
          projectId && page && serverVersion > 0
            ? publicPreviewUrl(projectId)
            : null
        }
        onPublish={openFullPreview}
        onGoHome={goHome}
        canUndo={canUndo}
        onUndo={undoEdit}
        onOpenHistory={
          projectId && serverVersion > 0
            ? () => setHistoryOpen((current) => !current)
            : undefined
        }
        historyOpen={historyOpen}
        canvasTool={canvasTool}
        onToggleSelect={toggleSelect}
        onToggleText={toggleText}
      />

      <div
        className={`relative grid min-h-0 min-w-0 flex-1 ${
          chatCollapsed
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[minmax(320px,var(--lovable-chat-w))_minmax(0,1fr)]"
        }`}
      >
        <VersionHistoryPanel
          open={historyOpen}
          projectId={projectId}
          currentVersion={serverVersion}
          onClose={() => setHistoryOpen(false)}
          onReverted={handleReverted}
        />
        <aside
          aria-label="AI builder chat"
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-[var(--lovable-border)] bg-[var(--lovable-panel)] lg:border-r ${
            chatCollapsed ? "hidden" : ""
          } ${mobilePane === "chat" ? "flex" : "hidden lg:flex"}`}
        >
          <div className="shrink-0 border-b border-[var(--lovable-border)] px-3 py-3 sm:px-4">
            <div className="rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-3 py-2.5">
              <p className="truncate text-[11px] text-[var(--lovable-text-faint)]">
                Project context
              </p>
              <p className="mt-0.5 truncate text-[12px] text-[var(--lovable-text-muted)]">
                {brief?.businessName
                  ? `${brief.businessName} · ${phase}`
                  : "Describe what you want to build"}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ChatThread
              messages={messages}
              isBusy={isBusy}
              phase={phase}
              onSuggestion={(text) => {
                void sendMessage(text);
              }}
              onAction={(action) => {
                handleChatAction(action, {
                  confirmBuild: async () => {
                    await confirmBuild();
                    refreshProjects();
                    setMobilePane("preview");
                  },
                  resetChat: () => {
                    startFreshHome();
                  },
                  previewPayload,
                  sendSkip: () => {
                    void sendMessage("skip for now");
                  },
                  applyPendingEdit: () => {
                    void applyPendingEdit();
                  },
                  dismissPendingEdit: () => {
                    dismissPendingEdit();
                  },
                  openLocationPicker: () => {
                    openLocationPicker();
                  },
                });
              }}
            />
          </div>

          <div className="shrink-0 space-y-2 border-t border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-3 py-3 sm:px-4">
            {canvasTool === "select" && selectedPick ? (
              <ComposerTargetChip
                pick={selectedPick}
                onClear={() => setSelectedPick(null)}
              />
            ) : null}
            {canvasTool === "select" && !selectedPick ? (
              <p className="px-0.5 text-[11px] text-[var(--lovable-text-faint)]">
                Click any text, button, or section — then say the change
              </p>
            ) : null}
            {canvasTool === "text" && !textSession ? (
              <p className="px-0.5 text-[11px] text-[var(--lovable-text-faint)]">
                Click a headline, button, or paragraph to edit it
              </p>
            ) : null}
            {error ? (
              <Alert
                variant="destructive"
                role="alert"
                className="border-red-500/30 bg-red-500/10 text-red-200"
              >
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {phase !== "building" ? (
              canUploadImage ? (
                <ChatInput
                  onSubmit={(text) => {
                    void sendMessage(text);
                    refreshProjects();
                  }}
                  onUploadImage={(file, target) =>
                    void uploadImage(file, target)
                  }
                  onApplyLibraryMedia={(item, target) =>
                    void applyLibraryMedia(item, target)
                  }
                  page={page}
                  allowImageUpload={canUploadImage}
                  disabled={inputDisabled}
                  placeholder={placeholder}
                  variant="editor"
                />
              ) : (
                <PromptComposer
                  variant="editor"
                  onSubmit={(text) => {
                    void sendMessage(text);
                    refreshProjects();
                  }}
                  disabled={inputDisabled}
                  placeholder={placeholder}
                  submitLabel="Build"
                />
              )
            ) : null}

            {showDevTools ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--lovable-text-faint)]">
                <input
                  type="checkbox"
                  checked={useFixture}
                  onChange={(event) => setUseFixture(event.target.checked)}
                  className="size-3.5 rounded border-[var(--lovable-border)] accent-[var(--lovable-blue)]"
                />
                Fixture mode (dev only — skip LLM)
              </label>
            ) : null}
          </div>
        </aside>

        <div
          className={`min-h-0 min-w-0 ${
            mobilePane === "preview"
              ? "flex flex-col"
              : "hidden lg:flex lg:flex-col"
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            {/* SectionActionPanel used to open above the preview on pick.
                Element picker + composer chip is the edit surface now. */}
            {editorViewMode === "assets" ? (
              <AssetsPanel
                page={page}
                busy={isBusy}
                onApplyToSection={(item, target) =>
                  void applyLibraryMedia(item, target)
                }
              />
            ) : (
            <LivePreviewPane
              page={page}
              pageFamily={pageFamily}
              businessName={brief?.businessName}
              phase={phase}
              isBusy={isBusy}
              deviceMode={deviceMode}
              showCodePlaceholder={editorViewMode === "code"}
              selectable={Boolean(page) && canvasTool !== "off"}
              selectedSectionType={selectedSectionType}
              onSelectSection={(type) =>
                setSelectedSectionType(type as typeof selectedSectionType)
              }
              onPick={canvasTool === "select" ? setSelectedPick : undefined}
              canvasTool={canvasTool}
              onToggleSelect={toggleSelect}
              onToggleText={toggleText}
              textSession={textSession}
              textHint={textHint}
              onStartTextEdit={startTextEdit}
              onCommitTextEdit={(value) => {
                const session = textSession;
                cancelTextEdit();
                if (!session) return;
                void commitInlineCopy(session.pick, value);
              }}
              onCancelTextEdit={cancelTextEdit}
              activeStageLabel={(() => {
                const running = messages.find(
                  (msg) =>
                    msg.role === "agent" && msg.stageStatus === "running",
                );
                if (!running) return null;
                return running.stageDetail ?? running.stageName ?? null;
              })()}
            />
            )}
          </div>
        </div>
      </div>
      <BuilderLocationPicker
        open={locationPicker.open}
        prefill={locationPicker.prefill}
        page={page}
        brief={brief}
        onClose={closeLocationPicker}
        onConfirm={(location) => {
          void confirmPickedLocation(location);
        }}
      />
    </div>
  );
}
