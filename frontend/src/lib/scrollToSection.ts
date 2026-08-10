import type { SectionType } from "@/types/page";

/**
 * Builds the canonical DOM id for a page section.
 */
export function sectionDomId(sectionType: SectionType | string): string {
  return `section-${sectionType}`;
}

/**
 * Finds the nearest scrollable ancestor for preview-safe scrolling.
 */
function findScrollParent(element: HTMLElement): HTMLElement | null {
  let parent: HTMLElement | null = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      parent.scrollHeight > parent.clientHeight;
    if (canScroll) return parent;
    parent = parent.parentElement;
  }
  return null;
}

/**
 * Smooth-scrolls to a section by type. Uses the preview scroll container when present.
 */
export function scrollToSection(sectionType: SectionType | string): void {
  if (typeof document === "undefined") return;

  const target = document.getElementById(sectionDomId(sectionType));
  if (!target) return;

  const scrollParent = findScrollParent(target);
  if (!scrollParent) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const parentRect = scrollParent.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const nextTop =
    targetRect.top - parentRect.top + scrollParent.scrollTop - 12;

  scrollParent.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
}

/**
 * Returns an onClick handler that scrolls to a section.
 */
export function createScrollHandler(sectionType: SectionType | string) {
  return () => {
    scrollToSection(sectionType);
  };
}
