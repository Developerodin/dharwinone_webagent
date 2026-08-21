import { describe, expect, it } from "vitest";
import { isStale, jobStages } from "./buildJobs.js";

describe("jobStages", () => {
  it("reads a stored stage array", () => {
    const stages = [{ name: "Copy", status: "done" }];
    expect(jobStages({ stages } as never)).toEqual(stages);
  });

  it("treats a non-array as empty rather than throwing", () => {
    // Rows written by an older build must not crash a reconnecting client.
    expect(jobStages({ stages: null } as never)).toEqual([]);
    expect(jobStages({ stages: { name: "Copy" } } as never)).toEqual([]);
  });
});

describe("isStale", () => {
  it("is false for a job that just reported progress", () => {
    expect(
      isStale({ status: "RUNNING", heartbeatAt: new Date() }),
    ).toBe(false);
  });

  it("is true once a running job stops reporting", () => {
    expect(
      isStale({
        status: "RUNNING",
        heartbeatAt: new Date(Date.now() - 6 * 60 * 1000),
      }),
    ).toBe(true);
  });

  it("never flags a finished job, however old", () => {
    const ancient = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isStale({ status: "SUCCEEDED", heartbeatAt: ancient })).toBe(false);
    expect(isStale({ status: "FAILED", heartbeatAt: ancient })).toBe(false);
  });
});
