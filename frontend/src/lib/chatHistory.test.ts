import { describe, expect, it } from "vitest";
import { recentChatTurns, stripAttachedTargetPrefix } from "./chatHistory";
import type { ChatMessage } from "../types/chat";

/**
 * Builds a chat message for history slicing tests.
 */
function msg(
  role: ChatMessage["role"],
  content: string,
  id = content,
): ChatMessage {
  return { id, role, content, timestamp: 1 };
}

describe("recentChatTurns", () => {
  it("drops agents, caps at 10, and omits the current user turn", () => {
    const messages: ChatMessage[] = [
      msg("agent", "Ask reviewing", "a1"),
      msg("user", "hi", "u1"),
      msg("assistant", "Hey — what are we building?", "s1"),
      ...Array.from({ length: 10 }, (_, index) =>
        msg(index % 2 === 0 ? "user" : "assistant", `turn ${index}`, `t${index}`),
      ),
      msg("user", "what is 2 + 3", "current"),
    ];

    const turns = recentChatTurns(messages, "what is 2 + 3");
    expect(turns).toHaveLength(10);
    expect(turns.some((turn) => turn.content === "what is 2 + 3")).toBe(false);
    expect(turns.some((turn) => turn.content === "Ask reviewing")).toBe(false);
    expect(turns.at(-1)?.content).toBe("turn 9");
  });

  it("strips attached-target prefixes from user history", () => {
    const messages: ChatMessage[] = [
      msg(
        "user",
        '[Attached target: hero.ctaLabel tag=button text="Book"]\nmake it gold',
      ),
      msg("assistant", "Updated the CTA."),
    ];
    expect(recentChatTurns(messages)[0]).toEqual({
      role: "user",
      content: "make it gold",
    });
  });
});

describe("stripAttachedTargetPrefix", () => {
  it("leaves plain chat alone", () => {
    expect(stripAttachedTargetPrefix("hello")).toBe("hello");
  });
});
