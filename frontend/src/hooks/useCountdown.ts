import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Counts down whole seconds to zero.
 *
 * Used for resend cooldowns and lockout timers so the UI can say "Resend in
 * 0:47" instead of an unexplained disabled button.
 */
export function useCountdown(): {
  remaining: number;
  start: (seconds: number) => void;
  stop: () => void;
} {
  const [remaining, setRemaining] = useState(0);
  const timer = useRef<number | null>(null);
  const deadline = useRef(0);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    setRemaining(0);
  }, []);

  const start = useCallback((seconds: number) => {
    if (timer.current !== null) window.clearInterval(timer.current);

    // Track an absolute deadline rather than decrementing a counter: a
    // background tab throttles intervals, and a decrementing counter would
    // drift into claiming time remains long after it has passed.
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);

    timer.current = window.setInterval(() => {
      const left = Math.ceil((deadline.current - Date.now()) / 1000);
      if (left <= 0) {
        window.clearInterval(timer.current!);
        timer.current = null;
        setRemaining(0);
      } else {
        setRemaining(left);
      }
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, []);

  return { remaining, start, stop };
}

/**
 * Formats seconds as m:ss for countdown labels.
 */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
