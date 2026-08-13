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
import { PromptComposer } from "@/components/shell/PromptComposer";
import {
  SectionActionPanel,
  type EditOp,
} from "@/components/shell/SectionActionPanel";
import { handleChatAction, useChatFlow } from "@/hooks/useChatFlow";
import { useAppViewSync } from "@/hooks/useAppViewSync";
import { saveAndOpenPreview } from "@/lib/previewStorage";
import { listProjects } from "@/lib/projectStorage";
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
    applyPendingEdit,
    dismissPendingEdit,
    selectedSectionType,
    setSelectedSectionType,
    applySectionOps,
    undoEdit,
    canUndo,
  } = useChatFlow({ useFixture: false });

  /**
   * Refreshes the project list from localStorage.
   */
  const refreshProjects = useCallback(() => {
    setProjects(listProjects());
    setSavedAt(Date.now());
  }, []);

  const { view, navigateView } = useAppViewSync({
    restoreProject,
    refreshProjects,
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
  const placeholder =
    phase === "clarifying"
      ? "Answer the questions above…"
      : phase === "confirm"
        ? "Or type changes to update the brief…"
        : page
          ? "Ask ProwPlus to edit the page…"
          : "Ask ProwPlus…";

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
   * Clears section selection when Esc is pressed.
   */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedSectionType) {
        setSelectedSectionType(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSectionType, setSelectedSectionType]);

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
    projectFilter === "starred" || projectFilter === "shared" ? [] : projects;

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
        onPublish={openFullPreview}
        onGoHome={goHome}
        canUndo={canUndo}
        onUndo={undoEdit}
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
                  applyPendingEdit: () => {
                    void applyPendingEdit();
                  },
                  dismissPendingEdit: () => {
                    dismissPendingEdit();
                  },
                });
              }}
            />
          </div>

          <div className="shrink-0 space-y-2 border-t border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-3 py-3 sm:px-4">
            {selectedSectionType ? (
              <div
                className="flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5"
                role="status"
                aria-live="polite"
              >
                <span className="text-[11px] font-medium text-blue-300">
                  Editing: <span className="capitalize">{selectedSectionType}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSectionType(null)}
                  className="ml-auto inline-flex size-4 items-center justify-center rounded text-blue-300 hover:text-blue-100 transition"
                  aria-label="Clear section selection"
                >
                  ✕
                </button>
              </div>
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
          <div className="flex min-h-0 flex-1 flex-col">
            {page && selectedSectionType ? (
              <div className="shrink-0 border-b border-[var(--lovable-border)] p-2">
                <SectionActionPanel
                  sectionType={selectedSectionType}
                  page={page}
                  onApplyOps={(ops: EditOp[]) => {
                    void applySectionOps(ops as Array<Record<string, unknown>>);
                  }}
                  onClose={() => setSelectedSectionType(null)}
                />
              </div>
            ) : null}
            <LivePreviewPane
              page={page}
              pageFamily={pageFamily}
              businessName={brief?.businessName}
              phase={phase}
              isBusy={isBusy}
              deviceMode={deviceMode}
              showCodePlaceholder={editorViewMode === "code"}
              selectable={Boolean(page)}
              selectedSectionType={selectedSectionType}
              onSelectSection={(type) =>
                setSelectedSectionType(type as typeof selectedSectionType)
              }
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
    </div>
  );
}
