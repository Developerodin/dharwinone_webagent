"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";

/** Desktop breakpoint matching `@min-[1024px]/page` header layouts. */
const DESKTOP_MIN_WIDTH = 1024;

export type UseMobileNavResult = {
  open: boolean;
  menuId: string;
  rootRef: RefObject<HTMLElement | null>;
  /** Opens or closes the mobile nav panel. */
  toggle: () => void;
  /** Closes the mobile nav panel. */
  close: () => void;
};

/**
 * Finds the nearest named `/page` container element for width observation.
 */
function findPageContainer(from: HTMLElement | null): Element | null {
  if (!from) return null;
  return from.closest('[class*="@container/page"]') ?? from.parentElement;
}

/**
 * Manages mobile nav open state with Escape, outside-click, scroll, and
 * desktop-breakpoint dismissal.
 */
export function useMobileNav(): UseMobileNavResult {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const menuId = useId();

  /**
   * Toggles the mobile navigation panel.
   */
  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  /**
   * Closes the mobile navigation panel.
   */
  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    /**
     * Closes the panel when Escape is pressed.
     */
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    /**
     * Closes the panel when clicking outside the header root.
     */
    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current;
      const target = event.target;
      if (!(target instanceof Node) || !root) return;
      if (!root.contains(target)) {
        setOpen(false);
      }
    }

    /**
     * Closes the panel after the page scrolls (e.g. section jump or user scroll).
     */
    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [open]);

  useEffect(() => {
    const root = rootRef.current;
    const container = findPageContainer(root);
    if (!container || typeof ResizeObserver === "undefined") return;

    /**
     * Closes the mobile menu once the page container reaches desktop width.
     */
    function handleResize(entries: ResizeObserverEntry[]) {
      const entry = entries[0];
      if (!entry) return;
      const width =
        entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      if (width >= DESKTOP_MIN_WIDTH) {
        setOpen(false);
      }
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return { open, menuId, rootRef, toggle, close };
}
