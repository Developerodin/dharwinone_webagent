import { describe, expect, it } from "vitest";
import {
  sanitizeAskHistory,
  stripAttachedTargetPrefix,
} from "./askHistory.js";

describe("sanitizeAskHistory", () => {
  it("drops agent rows, caps at 10, and strips attach prefixes", () => {
    const raw = [
      { role: "agent", content: "Ask reviewing" },
      { role: "user", content: '[Attached target: hero.ctaLabel tag=button text="Book"]\nmake it gold' },
      { role: "assistant", content: "Done — gold CTA." },
      ...Array.from({ length: 12 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `turn ${index}`,
      })),
    ];

    const turns = sanitizeAskHistory(raw);
    expect(turns).toHaveLength(10);
    expect(turns.some((turn) => turn.content.includes("Attached target"))).toBe(
      false,
    );
    expect(turns[0]?.content).toBe("turn 2");
    expect(turns.at(-1)?.content).toBe("turn 11");
  });

  it("ignores non-user/assistant roles and empty content", () => {
    expect(
      sanitizeAskHistory([
        { role: "system", content: "nope" },
        { role: "user", content: "   " },
        { role: "assistant", content: "Hello" },
      ]),
    ).toEqual([{ role: "assistant", content: "Hello" }]);
  });
});

describe("stripAttachedTargetPrefix", () => {
  it("returns the user text after the pick prefix", () => {
    expect(
      stripAttachedTargetPrefix(
        '[Attached target: hero.headline tag=h1 text="Hi"]\nmake it shorter',
      ),
    ).toBe("make it shorter");
  });
});
