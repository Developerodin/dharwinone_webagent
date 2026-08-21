import type { ChatMessage } from "@/types/chat";

export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

const MAX_TURNS = 10;
const MAX_CHARS = 500;

/**
 * Strips the click-target prefix so Ask sees the user's actual words.
 */
export function stripAttachedTargetPrefix(content: string): string {
  return content.replace(/^\[Attached target:[^\]]*\]\s*/i, "").trim();
}

/**
 * Last 10 user/assistant turns for Ask. Drops agent stages and the current user turn.
 */
export function recentChatTurns(
  messages: ChatMessage[],
  currentInstruction?: string,
): ChatHistoryTurn[] {
  const current = currentInstruction?.trim() ?? "";
  const turns: ChatHistoryTurn[] = [];

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const content = stripAttachedTargetPrefix(message.content).slice(
      0,
      MAX_CHARS,
    );
    if (!content) continue;
    turns.push({ role: message.role, content });
  }

  if (current && turns.length > 0) {
    const last = turns[turns.length - 1];
    if (last?.role === "user" && last.content === current.slice(0, MAX_CHARS)) {
      turns.pop();
    }
  }

  return turns.slice(-MAX_TURNS);
}
