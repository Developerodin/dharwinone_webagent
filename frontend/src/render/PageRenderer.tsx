import type { Page, PageSection } from "../types/page";
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
 * Deterministic Page JSON → React. Same JSON always yields the same HTML.
 */
export function PageRenderer({ page, animate = false }: PageRendererProps) {
  const family = resolvePageFamily(page.sections);
  const themeClass = themeClassForFamily(family);

  return (
    <div
      className={cn(
        "@container/page flex w-full min-w-0 flex-col gap-0 overflow-x-hidden",
        themeClass,
      )}
      aria-label="Rendered restaurant page"
      data-page-family={family}
    >
      {page.sections.map((section, index) => (
        <SectionSlot
          key={`${section.componentId}-${index}`}
          section={section}
          animate={animate}
          delayMs={index * 120}
        />
      ))}
    </div>
  );
}

type SectionSlotProps = {
  section: PageSection;
  animate: boolean;
  delayMs: number;
};

/**
 * Resolves a section to its registered component, or a safe fallback.
 */
function SectionSlot({ section, animate, delayMs }: SectionSlotProps) {
  const Component = pageComponentRegistry[section.componentId];

  if (!Component) {
    return (
      <div
        id={sectionDomId(section.type)}
        role="alert"
        className="border border-[var(--line)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]"
      >
        Unknown component: {section.componentId}
      </div>
    );
  }

  return (
    <div
      id={sectionDomId(section.type)}
      className={cn("scroll-mt-24", animate && "animate-section-enter")}
      style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <Component content={section.content} assets={section.assets} />
    </div>
  );
}
