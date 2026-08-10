import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatInput } from "@/components/ChatInput";
import { ChatThread } from "@/components/ChatThread";
import { LivePreviewPane } from "@/components/LivePreviewPane";
import {
  DashboardSidebar,
  type ProjectFilter,
} from "@/components/shell/DashboardSidebar";
import {
  EditorTopBar,
  formatLastSaved,
} from "@/components/shell/EditorTopBar";
import { HomeDashboard } from "@/components/shell/HomeDashboard";
import { MobileSidebarDrawer } from "@/components/shell/MobileSidebarDrawer";
import { PromptComposer } from "@/components/shell/PromptComposer";
import { handleChatAction, useChatFlow } from "@/hooks/useChatFlow";
import {
  readAppViewFromHash,
  writeAppViewHash,
  type AppView,
} from "@/lib/appView";
import { saveAndOpenPreview } from "@/lib/previewStorage";
import { getActiveProjectId, listProjects } from "@/lib/projectStorage";

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
  const [view, setView] = useState<AppView>(() => readAppViewFromHash());
  const [projects, setProjects] = useState(() => listProjects());
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [editorViewMode, setEditorViewMode] =
    useState<EditorViewMode>("preview");
  const [savedAt, setSavedAt] = useState<number | null>(null);

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
    restoreProject,
  } = useChatFlow({ useFixture: false });

  /**
   * Switches the active shell view and keeps the URL hash in sync.
   */
  const navigateView = useCallback((next: AppView) => {
    setView(next);
    writeAppViewHash(next);
  }, []);

  /**
   * Refreshes the project list from localStorage.
   */
  const refreshProjects = useCallback(() => {
    setProjects(listProjects());
    setSavedAt(Date.now());
  }, []);

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
  const placeholder =
    phase === "clarifying"
      ? "Answer the questions above…"
      : phase === "confirm"
        ? "Or type changes to update the brief…"
        : page
          ? "Ask ProwPlus to edit the page…"
          : "Ask ProwPlus…";

  const projectTitle = brief?.businessName ?? "New project";
  const didBootstrapRef = useRef(false);

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
    refreshProjects();
    navigateView("home");
    setChatCollapsed(false);
  }, [navigateView, refreshProjects, resetChat]);

  /**
   * Starts a new build from the home dashboard (new session, then intake).
   */
  const startFromHome = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      resetChat();
      navigateView("builder");
      setMobilePane("chat");
      setChatCollapsed(false);
      void sendMessage(trimmed);
      refreshProjects();
    },
    [navigateView, refreshProjects, resetChat, sendMessage],
  );

  /**
   * Restores a saved project into the builder workspace.
   */
  const openProject = useCallback(
    (id: string) => {
      const restored = restoreProject(id);
      if (!restored) {
        refreshProjects();
        return;
      }
      navigateView("builder");
      setMobilePane("chat");
      setChatCollapsed(false);
      refreshProjects();
    },
    [navigateView, refreshProjects, restoreProject],
  );

  /**
   * Boot once: `#builder` restores the active project; otherwise stay on home.
   */
  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    const desired = readAppViewFromHash();
    if (desired !== "builder") {
      writeAppViewHash("home");
      setView("home");
      return;
    }

    const activeId = getActiveProjectId();
    if (activeId && restoreProject(activeId)) {
      setView("builder");
      writeAppViewHash("builder");
      refreshProjects();
      return;
    }

    writeAppViewHash("home");
    setView("home");
  }, [refreshProjects, restoreProject]);

  /**
   * Keeps view in sync when the user uses browser back/forward on the hash.
   */
  useEffect(() => {
    /**
     * Handles hash changes for home ↔ builder without remounting the app.
     */
    function onHashChange() {
      const next = readAppViewFromHash();
      if (next === "builder") {
        const activeId = getActiveProjectId();
        if (activeId && restoreProject(activeId)) {
          setView("builder");
          refreshProjects();
          return;
        }
        // Mid-build new session (no persisted id yet) — keep builder if already there.
        if (view === "builder") return;
        writeAppViewHash("home");
        setView("home");
        return;
      }
      setView("home");
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [refreshProjects, restoreProject, view]);

  /**
   * Focuses the home prompt composer (used by sidebar Search).
   */
  function focusHomePrompt() {
    const field = document.querySelector<HTMLTextAreaElement>(
      "#prompt textarea",
    );
    field?.focus();
  }

  const sidebarProjects =
    projectFilter === "starred" || projectFilter === "shared" ? [] : projects;

  if (view === "home") {
    return (
      <div className="builder-shell flex h-svh min-w-0 overflow-hidden font-sans">
        <div className="hidden h-full shrink-0 md:flex">
          <DashboardSidebar
            projects={sidebarProjects}
            activeFilter={projectFilter}
            onFilterChange={setProjectFilter}
            onSelectProject={openProject}
            onGoDashboard={goHome}
            activeProjectId={projectId}
            onSearch={focusHomePrompt}
          />
        </div>
        <HomeDashboard
          onStartBuild={startFromHome}
          disabled={isBusy}
          onOpenMenu={() => setMobileNavOpen(true)}
        />
        <MobileSidebarDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          projects={sidebarProjects}
          activeFilter={projectFilter}
          onFilterChange={setProjectFilter}
          onSelectProject={openProject}
          onGoDashboard={goHome}
          activeProjectId={projectId}
          onSearch={focusHomePrompt}
        />
      </div>
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
        onPublish={openFullPreview}
        onGoHome={goHome}
      />

      <div
        className={`grid min-h-0 min-w-0 flex-1 ${
          chatCollapsed
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[minmax(320px,var(--lovable-chat-w))_minmax(0,1fr)]"
        }`}
      >
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
                });
              }}
            />
          </div>

          <div className="shrink-0 space-y-2 border-t border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-3 py-3 sm:px-4">
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
                  onApplyLibraryMedia={(imagePath, target) =>
                    void applyLibraryMedia(imagePath, target)
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
          <LivePreviewPane
            page={page}
            pageFamily={pageFamily}
            businessName={brief?.businessName}
            phase={phase}
            isBusy={isBusy}
            deviceMode={deviceMode}
            showCodePlaceholder={editorViewMode === "code"}
            activeStageLabel={(() => {
              const running = messages.find(
                (msg) =>
                  msg.role === "agent" && msg.stageStatus === "running",
              );
              if (!running) return null;
              return running.stageDetail ?? running.stageName ?? null;
            })()}
          />
        </div>
      </div>
    </div>
  );
}
