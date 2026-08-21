import { describe, expect, it } from "vitest";
import { formatAskClock } from "./askClock.js";

describe("formatAskClock", () => {
  it("formats UTC ISO and an India time string", () => {
    const clock = formatAskClock(new Date("2026-08-21T06:28:00.000Z"));
    expect(clock.nowUtc).toBe("2026-08-21T06:28:00.000Z");
    expect(clock.nowIst).toMatch(/August/);
    expect(clock.nowIst).toMatch(/2026/);
    expect(clock.nowIst).toMatch(/11:58/i);
  });
});
