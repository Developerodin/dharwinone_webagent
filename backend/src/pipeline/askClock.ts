/**
 * UTC + India clock lines injected into the Ask system prompt.
 */
export type AskClock = {
  nowUtc: string;
  nowIst: string;
};

/**
 * Formats the current instant for Ask so “what time is it” is accurate.
 */
export function formatAskClock(now: Date = new Date()): AskClock {
  const nowUtc = now.toISOString();
  const nowIst = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  return { nowUtc, nowIst };
}
