import type { CSSProperties, KeyboardEvent } from "react";
import type {
  Page,
  PageSection,
  SectionStyleOverrides,
  ThemeOverrides,
} from "../types/page";
import { pageComponentRegistry } from "../components/pageRegistry";
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
};

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
}: PageRendererProps) {
  const family = resolvePageFamily(page.sections);
  const themeClass = themeClassForFamily(family);
  const overrideStyle = themeOverrideStyle(page.themeOverrides);

  return (
    <div
      className={cn(
        "@container/page flex w-full min-w-0 flex-col gap-0 overflow-x-hidden",
        themeClass,
      )}
      style={overrideStyle}
      aria-label="Rendered restaurant page"
      data-page-family={family}
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
        />
      ))}
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
}: SectionSlotProps) {
  const Component = pageComponentRegistry[section.componentId];
  const { style: overrideStyle, paddingClass } = sectionOverrideStyle(
    section.styleOverrides,
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
   * Keyboard handler: Enter / Space activates section selection.
   */
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(section.type);
    }
  }

  return (
    <div
      id={sectionDomId(section.type)}
      className={cn(
        "scroll-mt-24",
        paddingClass,
        animate && "animate-section-enter",
        selectable && "cursor-pointer",
        selectable && !selected &&
          "hover:outline hover:outline-2 hover:outline-offset-[-2px] hover:outline-blue-400/60",
        selected &&
          "outline outline-2 outline-offset-[-2px] outline-blue-500",
      )}
      style={{
        ...(animate ? { animationDelay: `${delayMs}ms` } : null),
        ...overrideStyle,
      }}
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-label={selectable ? `Select ${section.type} section` : undefined}
      aria-pressed={selectable ? selected : undefined}
      onClick={selectable ? () => onSelect?.(section.type) : undefined}
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
