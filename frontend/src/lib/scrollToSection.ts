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
 * Reads the app shell header height from CSS so full-page preview scroll clears it.
 */
function readShellHeaderOffsetPx(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--shell-header-h")
    .trim();
  if (!raw) return 0;
  if (raw.endsWith("rem")) {
    const rem = Number.parseFloat(raw);
    const rootFont = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize || "16",
    );
    return Number.isFinite(rem) ? rem * rootFont : 0;
  }
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}

/**
 * Sticky clearance for in-page section headers (~family sticky bar).
 */
const FAMILY_STICKY_OFFSET_PX = 88;

/**
 * Smooth-scrolls to a section by type. Uses the preview scroll container when present.
 * No-ops when the target section is not on the page.
 */
export function scrollToSection(sectionType: SectionType | string): void {
  if (typeof document === "undefined") return;

  const target = document.getElementById(sectionDomId(sectionType));
  if (!target) return;

  // Prefer scrolling after layout settles so sticky headers measure correctly.
  requestAnimationFrame(() => {
    const liveTarget = document.getElementById(sectionDomId(sectionType));
    if (!liveTarget) return;

    const scrollParent = findScrollParent(liveTarget);
    if (!scrollParent) {
      // Window scroll (PreviewPage): clear shell + sticky family header.
      const offset = readShellHeaderOffsetPx() + FAMILY_STICKY_OFFSET_PX;
      const nextTop =
        liveTarget.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
      return;
    }

    const parentRect = scrollParent.getBoundingClientRect();
    const targetRect = liveTarget.getBoundingClientRect();
  // Preview canvas scroll: sticky site header clears inside the artboard (shell offset is 0 there).
  const nextTop =
    targetRect.top -
    parentRect.top +
    scrollParent.scrollTop -
    FAMILY_STICKY_OFFSET_PX;

    scrollParent.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  });
}

/**
 * Returns an onClick handler that scrolls to a section.
 */
export function createScrollHandler(sectionType: SectionType | string) {
  return () => {
    scrollToSection(sectionType);
  };
}
