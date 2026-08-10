import { useEffect, useRef, useState } from "react";
// import {
//   Expand,
//   MessageCircle,
//   Pencil,
//   Search,
//   Type,
// } from "lucide-react";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { PageRenderer } from "@/render/PageRenderer";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import type { PageFamily } from "@/lib/pageFamily";
import type { ChatPhase } from "@/types/chat";
import type { Page } from "@/types/page";

/** Desktop artboard width used for scaled live preview. */
const PREVIEW_WIDTH = 1200;

type DeviceMode = "desktop" | "tablet" | "mobile";

type LivePreviewPaneProps = {
  page: Page | null;
  pageFamily: PageFamily | null;
  businessName?: string;
  phase?: ChatPhase;
  isBusy?: boolean;
  activeStageLabel?: string | null;
  deviceMode?: DeviceMode;
  showCodePlaceholder?: boolean;
};

/**
 * Returns artboard width for the selected device preview mode.
 */
function widthForDevice(mode: DeviceMode): number {
  if (mode === "mobile") return 375;
  if (mode === "tablet") return 768;
  return PREVIEW_WIDTH;
}

/**
 * Whether this mode uses a centered device frame (vs full-bleed desktop).
 */
function isDeviceFrameMode(mode: DeviceMode): boolean {
  return mode === "mobile" || mode === "tablet";
}

/**
 * Returns horizontal content width inside a padded canvas element.
 */
function contentWidthOf(el: HTMLElement): number {
  const styles = getComputedStyle(el);
  const padX =
    (Number.parseFloat(styles.paddingLeft) || 0) +
    (Number.parseFloat(styles.paddingRight) || 0);
  return Math.max(0, el.clientWidth - padX);
}

/**
 * Live preview pane with dark canvas chrome and floating toolbar.
 */
export function LivePreviewPane({
  page,
  pageFamily,
  businessName,
  phase,
  isBusy = false,
  activeStageLabel = null,
  deviceMode = "desktop",
  showCodePlaceholder = false,
}: LivePreviewPaneProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [artboardHeight, setArtboardHeight] = useState(0);
  const artboardWidth = widthForDevice(deviceMode);
  const framed = isDeviceFrameMode(deviceMode);
  /** Centered device chrome only when a live page artboard is visible. */
  const showDeviceFrame = framed && Boolean(page) && !showCodePlaceholder;
  const frameWidth = Math.max(1, Math.round(artboardWidth * scale));
  const scaledHeight = Math.max(artboardHeight * scale, 1);

  const isBuilding =
    !page && (phase === "building" || (isBusy && phase === "analyzing"));

  useEffect(() => {
    const canvas = canvasRef.current;
    const artboard = artboardRef.current;
    if (!canvas) return;

    /**
     * Recalculates scale from canvas width and artboard content height.
     */
    const measure = () => {
      const available = contentWidthOf(canvas);
      if (available > 0) {
        setScale(Math.min(1, available / artboardWidth));
      }
      if (artboard) {
        setArtboardHeight(artboard.scrollHeight);
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(canvas);
    if (artboard) resizeObserver.observe(artboard);

    return () => resizeObserver.disconnect();
  }, [page, artboardWidth, deviceMode]);

  const hostLabel = businessName
    ? `${slugifyHost(businessName)}.prowplus.preview`
    : "preview.prowplus.local";

  const urlLabel = page
    ? hostLabel
    : isBuilding
      ? "Building preview…"
      : "Waiting for build…";

  return (
    <section
      aria-label="Live site preview"
      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#0a0a0c]"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="preview-browser-dot bg-[#ff5f57]" />
          <span className="preview-browser-dot bg-[#febc2e]" />
          <span className="preview-browser-dot bg-[#28c840]" />
        </div>
        <div
          className="flex min-w-0 flex-1 items-center justify-center rounded-full border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-3 py-1.5"
          title={hostLabel}
        >
          <p className="truncate text-center text-[11px] text-[var(--lovable-text-muted)] tabular-nums">
            {urlLabel}
          </p>
        </div>
        <p className="hidden shrink-0 text-[11px] text-[var(--lovable-text-faint)] sm:block">
          {page
            ? getPageFamilyLabel(pageFamily ?? "premium")
            : isBuilding
              ? "Assembling"
              : "Live preview"}
        </p>
      </div>

      <div
        ref={canvasRef}
        className={
          showDeviceFrame
            ? "relative flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden p-3 sm:p-4 md:p-5"
            : "relative min-h-0 min-w-0 flex-1 overflow-auto p-3 sm:p-4 md:p-5"
        }
      >
        {showCodePlaceholder ? (
          <CodePlaceholder />
        ) : page ? (
          <div
            className={
              framed
                ? "preview-browser flex h-full max-h-full shrink-0 flex-col overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.45)] animate-shell-in"
                : "preview-browser mx-auto w-full max-w-full overflow-hidden rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.45)] animate-shell-in"
            }
            style={framed ? { width: frameWidth } : undefined}
            data-device-frame={framed ? deviceMode : "desktop"}
            aria-label={
              framed
                ? `${deviceMode === "mobile" ? "Mobile" : "Tablet"} device preview`
                : "Desktop preview"
            }
          >
            <div
              className={
                framed
                  ? // overflow-x-hidden: vertical scrollbar must not create a bottom bar
                    // (content is exactly frameWidth; classic gutter overflow).
                    "chat-scrollbar relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white"
                  : "relative w-full overflow-hidden bg-white"
              }
              style={framed ? undefined : { height: scaledHeight }}
            >
              <div
                className="relative w-full overflow-hidden"
                style={{ height: scaledHeight }}
              >
                <div
                  ref={artboardRef}
                  className="@container/preview origin-top-left"
                  style={{
                    width: artboardWidth,
                    transform: `scale(${scale})`,
                  }}
                >
                  <PageRenderer page={page} />
                </div>
              </div>
            </div>
          </div>
        ) : isBuilding ? (
          <BuildingPreview
            activeStageLabel={activeStageLabel}
            businessName={businessName}
          />
        ) : (
          <EmptyPreview />
        )}
      </div>

      {/* Canvas toolbar — temporarily hidden
      <div
        className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center"
        aria-hidden={false}
      >
        <div
          className="canvas-toolbar pointer-events-auto flex items-center gap-0.5 rounded-full px-1.5 py-1"
          role="toolbar"
          aria-label="Canvas tools"
        >
          {(
            [
              { icon: Expand, label: "Fit canvas" },
              { icon: Type, label: "Text tool" },
              { icon: Pencil, label: "Edit tool" },
              { icon: MessageCircle, label: "Comment" },
              { icon: Search, label: "Zoom" },
            ] as const
          ).map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                aria-label={tool.label}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
      */}
    </section>
  );
}

/**
 * Placeholder when Code tab is selected in the editor chrome.
 */
function CodePlaceholder() {
  return (
    <div
      className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] p-4 animate-shell-in"
      role="status"
      aria-label="Code view coming soon"
    >
      <p className="text-sm font-medium text-[var(--lovable-text)]">Code</p>
      <p className="mt-1 text-xs text-[var(--lovable-text-faint)]">
        Source export is coming soon. Use Preview to iterate for now.
      </p>
      <pre className="mt-4 flex-1 overflow-auto rounded-lg bg-[var(--lovable-bg)] p-3 font-mono text-[11px] leading-relaxed text-[var(--lovable-text-muted)]">
        {`// Page model is managed in chat\n// Switch back to Preview to see the live site`}
      </pre>
    </div>
  );
}

type BuildingPreviewProps = {
  activeStageLabel?: string | null;
  businessName?: string;
};

/**
 * Calm building state while agents assemble the page (no fake progress bar).
 */
function BuildingPreview({
  activeStageLabel,
  businessName,
}: BuildingPreviewProps) {
  const detail =
    activeStageLabel?.trim() ||
    "Agents are drafting layout, copy, and imagery…";

  return (
    <div
      className="relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] animate-shell-in"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Preview is building"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      >
        <div className="absolute inset-x-8 top-10 h-10 rounded-lg bg-[var(--lovable-active)] animate-preview-shimmer" />
        <div className="absolute inset-x-8 top-28 h-36 rounded-xl bg-[var(--lovable-active)] animate-preview-shimmer [animation-delay:120ms]" />
        <div className="absolute inset-x-8 top-72 grid grid-cols-3 gap-3">
          <div className="h-20 rounded-lg bg-[var(--lovable-active)] animate-preview-shimmer [animation-delay:80ms]" />
          <div className="h-20 rounded-lg bg-[var(--lovable-active)] animate-preview-shimmer [animation-delay:160ms]" />
          <div className="h-20 rounded-lg bg-[var(--lovable-active)] animate-preview-shimmer [animation-delay:240ms]" />
        </div>
      </div>

      <div className="relative z-10 mt-auto flex flex-col items-center px-8 pb-16 pt-16 text-center">
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-violet-500 to-blue-500 text-sm font-semibold text-white shadow-[0_0_0_6px_rgba(168,85,247,0.2)] animate-think-pulse"
          aria-hidden="true"
        >
          P+
        </div>
        <p className="text-2xl font-semibold tracking-tight text-[var(--lovable-text)]">
          {businessName ? `Building ${businessName}` : "Building your site"}
        </p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--lovable-text-muted)]">
          {detail}
        </p>
        <div className="mt-4">
          <ThinkingIndicator label="Working" size="md" live />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state shown before a page has been built.
 */
function EmptyPreview() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--lovable-border)] bg-[var(--lovable-panel)]/80 px-8 text-center animate-shell-in">
      <div
        className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-violet-500 to-blue-500 text-sm font-semibold text-white"
        aria-hidden="true"
      >
        P+
      </div>
      <p className="text-2xl font-semibold tracking-tight text-[var(--lovable-text)]">
        Your site preview
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--lovable-text-muted)]">
        Ask ProwPlus in chat. When the page builds, it appears here — ready to
        iterate.
      </p>
    </div>
  );
}

/**
 * Builds a simple host-style slug from a business name.
 */
function slugifyHost(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  return slug || "site";
}
