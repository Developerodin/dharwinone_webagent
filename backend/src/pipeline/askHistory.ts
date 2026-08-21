export type AskHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

const MAX_TURNS = 10;
const MAX_CHARS = 500;

/**
 * Strips the click-target prefix so history is readable conversation.
 */
export function stripAttachedTargetPrefix(content: string): string {
  return content.replace(/^\[Attached target:[^\]]*\]\s*/i, "").trim();
}

/**
 * Keeps the last 10 user/assistant turns, dropping agents and empty rows.
 */
export function sanitizeAskHistory(raw: unknown): AskHistoryTurn[] {
  if (!Array.isArray(raw)) return [];

  const turns: AskHistoryTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = stripAttachedTargetPrefix(content).slice(0, MAX_CHARS);
    if (!trimmed) continue;
    turns.push({ role, content: trimmed });
  }

  return turns.slice(-MAX_TURNS);
}
