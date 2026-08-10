import { describe, expect, it } from "vitest";
import {
  ensureStageFeel,
  isStageDelayDisabled,
  sleepRandomMs,
  stageDelayRange,
} from "./stageDelay.js";

describe("stageDelay", () => {
  it("exposes inclusive 3–10s bands per stage", () => {
    const planner = stageDelayRange("Section Planner");
    const copywriter = stageDelayRange("Copywriter");
    expect(planner.min).toBeGreaterThanOrEqual(3000);
    expect(planner.max).toBeLessThanOrEqual(10000);
    expect(copywriter.min).toBeGreaterThanOrEqual(planner.min);
    expect(copywriter.max).toBe(10000);
  });

  it("sleepRandomMs stays within bounds", async () => {
    const duration = await sleepRandomMs(10, 20);
    expect(duration).toBeGreaterThanOrEqual(10);
    expect(duration).toBeLessThanOrEqual(20);
  });

  it("skips padding when delays are disabled", async () => {
    expect(isStageDelayDisabled()).toBe(true);
    const startedAt = Date.now() - 5;
    const elapsed = await ensureStageFeel("Assembler", startedAt);
    expect(elapsed).toBeLessThan(100);
  });
});
