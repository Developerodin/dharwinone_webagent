import { describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { formatBriefHoursLines } from "./hoursFormat.js";

describe("formatBriefHoursLines", () => {
  it("formats {days,open,close} into strings the UI can render", () => {
    expect(formatBriefHoursLines(FIXTURE_BRIEF)).toEqual([
      "Mon–Sun 12:00–22:00",
    ]);
  });

  it("drops empty rows", () => {
    expect(
      formatBriefHoursLines({
        ...FIXTURE_BRIEF,
        hours: [{ days: "  ", open: "10:00", close: "18:00" }],
      }),
    ).toEqual([]);
  });
});
