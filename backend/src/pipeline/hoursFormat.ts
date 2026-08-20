import type { Brief } from "../schemas/brief.schema.js";

/**
 * Turns brief.hours objects into display lines the section UI already renders.
 */
export function formatBriefHoursLines(brief: Brief): string[] {
  return (brief.hours ?? [])
    .map((entry) => {
      const days = entry.days.trim();
      const open = entry.open.trim();
      const close = entry.close.trim();
      if (!days || !open || !close) return "";
      return `${days} ${open}–${close}`;
    })
    .filter((line) => line.length > 0);
}
