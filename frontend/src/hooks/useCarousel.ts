import { useCallback, useEffect, useState } from "react";

type UseCarouselOptions = {
  length: number;
  /** Auto-advance interval in ms; omit or 0 to disable. */
  intervalMs?: number;
};

/**
 * Lightweight carousel state for hero/testimonial sliders (no extra deps).
 */
export function useCarousel({ length, intervalMs = 0 }: UseCarouselOptions) {
  const [index, setIndex] = useState(0);
  const safeLength = Math.max(length, 0);

  /**
   * Advances to the next slide (wraps).
   */
  const next = useCallback(() => {
    if (safeLength <= 1) return;
    setIndex((current) => (current + 1) % safeLength);
  }, [safeLength]);

  /**
   * Moves to the previous slide (wraps).
   */
  const prev = useCallback(() => {
    if (safeLength <= 1) return;
    setIndex((current) => (current - 1 + safeLength) % safeLength);
  }, [safeLength]);

  /**
   * Jumps to an absolute slide index.
   */
  const goTo = useCallback(
    (target: number) => {
      if (safeLength <= 0) return;
      setIndex(((target % safeLength) + safeLength) % safeLength);
    },
    [safeLength],
  );

  useEffect(() => {
    setIndex(0);
  }, [safeLength]);

  useEffect(() => {
    if (!intervalMs || safeLength <= 1) return;
    const id = window.setInterval(next, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, next, safeLength]);

  return { index, next, prev, goTo };
}
