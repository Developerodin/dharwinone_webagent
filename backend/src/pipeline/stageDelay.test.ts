import { describe, expect, it } from "vitest";
import {
  ensureStageFeel,
  isStageDelayDisabled,
  sleepRandomMs,
  stageDelayRange,
} from "./stageDelay.js";

describe("stageDelay", () => {
  it("exposes inclusive 300–900ms bands per stage", () => {
    const planner = stageDelayRange("Section Planner");
    const copywriter = stageDelayRange("Copywriter");
    expect(planner.min).toBe(300);
    expect(planner.max).toBe(900);
    expect(copywriter.min).toBe(300);
    expect(copywriter.max).toBe(900);
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
