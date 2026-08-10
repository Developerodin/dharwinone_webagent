import {
  ChevronDown,
  Code2,
  Eye,
  ExternalLink,
  Globe2,
  MessageSquare,
  Monitor,
  PanelLeft,
  Smartphone,
  Tablet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeviceMode = "desktop" | "tablet" | "mobile";
type ViewMode = "preview" | "code" | "assets";
type MobilePane = "chat" | "preview";

type EditorTopBarProps = {
  projectTitle: string;
  lastSavedLabel?: string;
  pageLabel?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  mobilePane: MobilePane;
  onMobilePaneChange: (pane: MobilePane) => void;
  chatCollapsed?: boolean;
  onToggleChat?: () => void;
  onOpenPreview?: () => void;
  canOpenPreview?: boolean;
  onPublish?: () => void;
  onGoHome?: () => void;
};

/**
 * Formats a short "Last saved" relative label.
 */
export function formatLastSaved(timestamp?: number | null): string {
  if (!timestamp) return "Not saved yet";
  const deltaSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (deltaSec < 15) return "Last saved just now";
  if (deltaSec < 60) return `Last saved ${deltaSec}s ago`;
  if (deltaSec < 3600) return `Last saved ${Math.floor(deltaSec / 60)}m ago`;
  return `Last saved ${Math.floor(deltaSec / 3600)}h ago`;
}

/**
 * Dark Lovable-style editor chrome top bar.
 */
export function EditorTopBar({
  projectTitle,
  lastSavedLabel = "Not saved yet",
  pageLabel = "Homepage",
  viewMode,
  onViewModeChange,
  deviceMode,
  onDeviceModeChange,
  mobilePane,
  onMobilePaneChange,
  chatCollapsed = false,
  onToggleChat,
  onOpenPreview,
  canOpenPreview = false,
  onPublish: _onPublish,
  onGoHome,
}: EditorTopBarProps) {
  return (
    <header
      className="builder-header flex shrink-0 items-center gap-2 px-2 sm:gap-3 sm:px-3"
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        {onToggleChat ? (
          <button
            type="button"
            onClick={onToggleChat}
            className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]"
            aria-label={chatCollapsed ? "Show chat panel" : "Hide chat panel"}
            aria-pressed={!chatCollapsed}
          >
            <PanelLeft className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onGoHome}
          className="flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition hover:bg-[var(--lovable-hover)]"
          aria-label={`Project ${projectTitle}. Open dashboard`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate text-[13px] font-medium text-[var(--lovable-text)]">
                {projectTitle}
              </p>
              <ChevronDown
                className="size-3.5 shrink-0 text-[var(--lovable-text-faint)]"
                aria-hidden="true"
              />
            </div>
            <p className="truncate text-[10px] text-[var(--lovable-text-faint)]">
              {lastSavedLabel}
            </p>
          </div>
        </button>
      </div>

      <div className="mx-auto hidden min-w-0 items-center gap-2 md:flex">
        <div
          className="flex rounded-lg border border-[var(--lovable-border)] bg-[var(--lovable-bg)] p-0.5"
          role="tablist"
          aria-label="Editor view"
        >
          {(
            [
              {
                id: "preview" as const,
                label: "Preview",
                icon: Eye,
                disabled: false,
              },
              {
                id: "code" as const,
                label: "Code",
                icon: Code2,
                disabled: true,
              },
              {
                id: "assets" as const,
                label: "Assets",
                icon: Globe2,
                disabled: true,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={tab.disabled}
                title={tab.disabled ? "Coming soon" : undefined}
                onClick={() => {
                  if (!tab.disabled) onViewModeChange(tab.id);
                }}
                className={cn(
                  "inline-flex min-h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                  active
                    ? "bg-[var(--lovable-active)] text-[var(--lovable-text)]"
                    : "text-[var(--lovable-text-faint)] hover:text-[var(--lovable-text-muted)] disabled:hover:text-[var(--lovable-text-faint)]",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="flex rounded-lg border border-[var(--lovable-border)] bg-[var(--lovable-bg)] p-0.5"
          role="group"
          aria-label="Device preview"
        >
          {(
            [
              { id: "desktop" as const, icon: Monitor, label: "Desktop" },
              { id: "tablet" as const, icon: Tablet, label: "Tablet" },
              { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
            ] as const
          ).map((device) => {
            const Icon = device.icon;
            const active = deviceMode === device.id;
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => onDeviceModeChange(device.id)}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-md transition",
                  active
                    ? "bg-[var(--lovable-active)] text-[var(--lovable-text)]"
                    : "text-[var(--lovable-text-faint)] hover:text-[var(--lovable-text-muted)]",
                )}
                aria-label={device.label}
                aria-pressed={active}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="inline-flex min-h-7 cursor-not-allowed items-center gap-1 rounded-lg border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-2.5 text-[12px] text-[var(--lovable-text-muted)] opacity-40"
          aria-label={`Current page: ${pageLabel}`}
        >
          {pageLabel}
          <ChevronDown className="size-3" aria-hidden="true" />
        </button>

        {onOpenPreview ? (
          <button
            type="button"
            onClick={onOpenPreview}
            disabled={!canOpenPreview}
            className="inline-flex size-7 items-center justify-center rounded-lg text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] disabled:opacity-35"
            aria-label="Open full preview in new tab"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div
          className="flex rounded-lg border border-[var(--lovable-border)] bg-[var(--lovable-bg)] p-0.5 lg:hidden"
          role="tablist"
          aria-label="Workspace view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === "chat"}
            onClick={() => onMobilePaneChange("chat")}
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition",
              mobilePane === "chat"
                ? "bg-[var(--lovable-active)] text-[var(--lovable-text)]"
                : "text-[var(--lovable-text-faint)]",
            )}
            aria-label="Show chat"
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === "preview"}
            onClick={() => onMobilePaneChange("preview")}
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition",
              mobilePane === "preview"
                ? "bg-[var(--lovable-active)] text-[var(--lovable-text)]"
                : "text-[var(--lovable-text-faint)]",
            )}
            aria-label="Show preview"
          >
            <Monitor className="size-3.5" aria-hidden="true" />
            Preview
          </button>
        </div>

        <div
          className="hidden size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-semibold text-white sm:flex"
          aria-hidden="true"
        >
          A
        </div>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="hidden min-h-8 cursor-not-allowed items-center rounded-lg border border-[var(--lovable-border)] px-2.5 text-[12px] font-medium text-[var(--lovable-text-muted)] opacity-40 sm:inline-flex"
          aria-label="Share project"
        >
          Share
        </button>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="hidden min-h-8 cursor-not-allowed items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--lovable-upgrade-from)] to-[var(--lovable-upgrade-to)] px-2.5 text-[12px] font-medium text-white opacity-40 shadow-sm sm:inline-flex"
          aria-label="Upgrade plan"
        >
          <Zap className="size-3.5" aria-hidden="true" />
          Upgrade
        </button>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="inline-flex min-h-8 cursor-not-allowed items-center rounded-lg bg-[var(--lovable-publish)] px-3 text-[12px] font-medium text-white opacity-40"
          aria-label="Publish site"
        >
          Publish
        </button>
      </div>
    </header>
  );
}
