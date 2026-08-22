import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import type {
  Page,
  PageSection,
  SectionStyleOverrides,
  ThemeOverrides,
} from "../types/page";
import { pageComponentRegistry } from "../components/pageRegistry";
import {
  ElementPickOverlay,
  type PickOverlayRect,
} from "@/components/preview/ElementPickOverlay";
import { InlineTextEditor } from "@/components/preview/InlineTextEditor";
import {
  previewPickFromEvent,
  resolvePickTag,
  sectionOnlyPick,
  elementFromPointerTarget,
  type PreviewPick,
} from "@/lib/resolvePreviewPick";
import { canInlineEditPick, copyValueForPick } from "@/lib/inlineCopy";
import type { InlineTextSession } from "@/hooks/useCanvasTool";
import {
  getFamilyFromComponentId,
  themeClassForFamily,
  type PageFamily,
} from "../lib/pageFamily";
import { sectionDomId } from "../lib/scrollToSection";
import { cn } from "@/lib/utils";

type PageRendererProps = {
  page: Page;
  /** When true, sections animate in with staggered fade-up. */
  animate?: boolean;
  /** When true, each section is keyboard/click selectable. */
  selectable?: boolean;
  /** The currently selected section type (highlighted with a ring). */
  selectedSectionType?: string | null;
  /** Called when the user clicks or activates a section wrapper. */
  onSelectSection?: (type: string) => void;
  /** Called with the resolved element pick in Edit/inspect mode. */
  onPick?: (pick: PreviewPick) => void;
  /** Select = attach for chat; text = inline copy overlay. */
  pickMode?: "select" | "text";
  /** Live inline editor session, rendered over the page. */
  textSession?: InlineTextSession | null;
  /** Opens the overlay, or null when the click is not editable text. */
  onStartTextEdit?: (session: InlineTextSession | null) => void;
  /** Commits the overlay value. */
  onCommitTextEdit?: (value: string) => void;
  /** Closes the overlay without saving. */
  onCancelTextEdit?: () => void;
};

/**
 * Bounding box of a hovered node, relative to the page root.
 */
function overlayRectFor(
  root: HTMLElement,
  target: HTMLElement,
): PickOverlayRect | null {
  if (target.closest("[data-pick-overlay]")) return null;
  if (target === root) return null;
  const rootRect = root.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  const sectionRoot = target.closest("[data-section]");
  const tag =
    sectionRoot instanceof HTMLElement
      ? resolvePickTag(target, sectionRoot).tag
      : target.tagName.toLowerCase();
  return {
    top: box.top - rootRect.top,
    left: box.left - rootRect.left,
    width: box.width,
    height: box.height,
    label: `<${tag}>`,
  };
}

/**
 * True when the event originated in a native typing control.
 * Buttons/links must stay pickable in T-mode (CTA labels).
 */
function isNativeTypingControl(target: EventTarget | null): boolean {
  const el =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  if (!el) return false;
  return Boolean(
    el.closest("input, textarea, select, option, [contenteditable='true']"),
  );
}

/**
 * Detects the page family from the first recognizable component id.
 */
function resolvePageFamily(sections: PageSection[]): PageFamily {
  for (const section of sections) {
    const family = getFamilyFromComponentId(section.componentId);
    if (family) return family;
  }
  return "premium";
}

/**
 * Maps page themeOverrides to CSS custom properties (incl. derived surfaces).
 * Minimal family ignores these — chroma-0 paper/ink lives in `.minimal-theme`.
 */
function themeOverrideStyle(overrides?: ThemeOverrides): CSSProperties | undefined {
  if (!overrides) return undefined;
  const style: Record<string, string> = {};
  if (overrides.accent) style["--theme-accent"] = overrides.accent;
  if (overrides.accentContrast) {
    style["--theme-accent-contrast"] = overrides.accentContrast;
  }
  if (overrides.bg) style["--theme-bg"] = overrides.bg;
  if (overrides.bgAlt) style["--theme-bg-alt"] = overrides.bgAlt;
  if (overrides.bgDark) style["--theme-bg-dark"] = overrides.bgDark;
  if (overrides.card) style["--theme-card"] = overrides.card;
  if (overrides.muted) style["--theme-muted"] = overrides.muted;
  if (overrides.onDark) style["--theme-on-dark"] = overrides.onDark;
  if (overrides.ink) style["--theme-ink"] = overrides.ink;
  if (overrides.fontDisplay) style["--font-display"] = overrides.fontDisplay;
  if (overrides.fontBody) style["--font-body"] = overrides.fontBody;
  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined;
}

/**
 * Maps section styleOverrides to inline styles + padding class.
 * Sets --theme-* so child sections (bg-[var(--theme-bg)], text ink/muted) actually change.
 */
function sectionOverrideStyle(overrides?: SectionStyleOverrides): {
  style?: CSSProperties;
  paddingClass?: string;
} {
  if (!overrides) return {};
  const style: Record<string, string> = {};
  if (overrides.background) {
    const bg = overrides.background;
    style.backgroundColor = bg;
    style["--theme-bg"] = bg;
    style["--theme-bg-alt"] = bg;
    style["--theme-bg-dark"] = bg;
    style["--theme-card"] = bg;
  }
  if (overrides.text) {
    const ink = overrides.text;
    style.color = ink;
    style["--theme-ink"] = ink;
    style["--theme-muted"] = ink;
    style["--theme-on-dark"] = ink;
  }
  if (overrides.button) {
    style["--theme-accent"] = overrides.button;
  }
  const paddingClass =
    overrides.paddingY === "tight"
      ? "[&>section]:!py-8 [&>section]:@min-[768px]:!py-10"
      : overrides.paddingY === "roomy"
        ? "[&>section]:!py-20 [&>section]:@min-[768px]:!py-28"
        : undefined;
  return {
    style: Object.keys(style).length > 0 ? (style as CSSProperties) : undefined,
    paddingClass,
  };
}

/**
 * Deterministic Page JSON → React. Same JSON always yields the same HTML.
 */
export function PageRenderer({
  page,
  animate = false,
  selectable = false,
  selectedSectionType = null,
  onSelectSection,
  onPick,
  pickMode = "select",
  textSession = null,
  onStartTextEdit,
  onCommitTextEdit,
  onCancelTextEdit,
}: PageRendererProps) {
  const family = resolvePageFamily(page.sections);
  const themeClass = themeClassForFamily(family);
  const overrideStyle =
    family === "minimal"
      ? undefined
      : themeOverrideStyle(page.themeOverrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hoverRect, setHoverRect] = useState<PickOverlayRect | null>(null);

  /**
   * Updates the inspect overlay as the pointer moves over preview nodes.
   */
  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!selectable) return;
    const root = rootRef.current;
    if (!root) return;
    const target = elementFromPointerTarget(event.target, root);
    setHoverRect(overlayRectFor(root, target));
  }

  /**
   * Clears the inspect overlay when the pointer leaves the page.
   */
  function handleMouseLeave() {
    setHoverRect(null);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative @container/page flex w-full min-w-0 flex-col gap-0 overflow-x-hidden",
        themeClass,
      )}
      style={overrideStyle}
      aria-label="Rendered restaurant page"
      data-page-family={family}
      data-density={page.design?.density}
      data-type-scale={page.design?.typeScale}
      onMouseMove={selectable ? handleMouseMove : undefined}
      onMouseLeave={selectable ? handleMouseLeave : undefined}
    >
      {page.sections.map((section, index) => (
        <SectionSlot
          key={`${section.componentId}-${index}`}
          section={section}
          animate={animate}
          delayMs={index * 120}
          selectable={selectable}
          selected={selectable && selectedSectionType === section.type}
          onSelect={onSelectSection}
          onPick={onPick}
          pickMode={pickMode}
          overlayRootRef={rootRef}
          page={page}
          onStartTextEdit={onStartTextEdit}
        />
      ))}
      {selectable && !textSession ? (
        <ElementPickOverlay rect={hoverRect} />
      ) : null}
      {textSession && onCommitTextEdit && onCancelTextEdit ? (
        <InlineTextEditor
          key={`${textSession.pick.section}-${textSession.pick.field ?? "copy"}`}
          session={textSession}
          onCommit={onCommitTextEdit}
          onCancel={onCancelTextEdit}
        />
      ) : null}
    </div>
  );
}

type SectionSlotProps = {
  section: PageSection;
  animate: boolean;
  delayMs: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (type: string) => void;
  onPick?: (pick: PreviewPick) => void;
  pickMode?: "select" | "text";
  overlayRootRef: RefObject<HTMLDivElement | null>;
  page: Page;
  onStartTextEdit?: (session: InlineTextSession | null) => void;
};

/**
 * Resolves a section to its registered component, or a safe fallback.
 */
function SectionSlot({
  section,
  animate,
  delayMs,
  selectable = false,
  selected = false,
  onSelect,
  onPick,
  pickMode = "select",
  overlayRootRef,
  page,
  onStartTextEdit,
}: SectionSlotProps) {
  const Component = pageComponentRegistry[section.componentId];
  const rootRef = useRef<HTMLDivElement>(null);
  const family = getFamilyFromComponentId(section.componentId);
  const { style: overrideStyle, paddingClass } = sectionOverrideStyle(
    family === "minimal" ? { paddingY: section.styleOverrides?.paddingY } : section.styleOverrides,
  );

  if (!Component) {
    return (
      <div
        id={sectionDomId(section.type)}
        role="alert"
        className="border border-[var(--theme-line)] bg-[var(--theme-card)] px-4 py-6 text-sm text-[var(--theme-muted)]"
      >
        Unknown component: {section.componentId}
      </div>
    );
  }

  /**
   * Keyboard handler: Enter / Space attaches the whole section.
   */
  function handleKeyDown(e: KeyboardEvent) {
    if (isNativeTypingControl(e.target)) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const pick = sectionOnlyPick(section.type);
    onPick?.(pick);
    onSelect?.(section.type);
  }

  /**
   * Capture-phase click: pick the element and block preview navigation.
   */
  function handleClickCapture(e: ReactMouseEvent<HTMLDivElement>) {
    if (!selectable) return;
    if (isNativeTypingControl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    const root = rootRef.current;
    if (!root) return;
    const pick = previewPickFromEvent(e.nativeEvent, section, root);
    onPick?.(pick);
    onSelect?.(section.type);
    if (pickMode !== "text") return;
    if (!canInlineEditPick(pick)) {
      onStartTextEdit?.(null);
      return;
    }
    const el = elementFromPointerTarget(e.nativeEvent.target, root);
    const { node } = resolvePickTag(el, root);
    const pageRoot = overlayRootRef.current;
    const rect = pageRoot ? overlayRectFor(pageRoot, node) : null;
    if (!rect) {
      onStartTextEdit?.(null);
      return;
    }
    onStartTextEdit?.({
      pick,
      rect,
      value: copyValueForPick(page, pick),
    });
  }

  // Creative Director decisions ride on the wrapper. `sectionLayout.css` reads
  // these and rewrites the --theme-* tokens the section components consume, so
  // a plan change reaches the DOM without every component opting in.
  //
  // Pages saved before the plan existed carry no layout. They must stay
  // pixel-identical, so they get no attributes at all and every --sec-* var
  // falls back to the value the component tokens hardcoded before.
  const layout = section.layout;

  return (
    <div
      ref={rootRef}
      id={sectionDomId(section.type)}
      data-section={section.type}
      data-layout-bg={layout?.background}
      data-layout-intent={layout?.intent}
      data-emphasis={layout?.emphasis}
      data-spacing={layout?.spacing}
      className={cn(
        "scroll-mt-24",
        paddingClass,
        animate && "animate-section-enter",
        selectable && "cursor-crosshair",
        selected &&
          "outline outline-2 outline-offset-[-2px] outline-blue-500/50",
      )}
      style={{
        ...(animate ? { animationDelay: `${delayMs}ms` } : null),
        ...overrideStyle,
      }}
      role={selectable ? "group" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-label={
        selectable
          ? `Pick an element in the ${section.type} section`
          : undefined
      }
      onClickCapture={selectable ? handleClickCapture : undefined}
      onKeyDown={selectable ? handleKeyDown : undefined}
    >
      <Component
        content={section.content}
        assets={section.assets}
        layout={section.layout}
      />
    </div>
  );
}
