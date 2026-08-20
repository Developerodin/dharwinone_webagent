import { describe, expect, it } from "vitest";
import { slopCheck } from "./slopCheck.js";

describe("slopCheck", () => {
  it("flags restaurant clichés and marketing buzzwords", () => {
    const result = slopCheck({
      headline: "A culinary journey and authentic experience",
      body: "We empower diners with a curated experience.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.matches.join(" ").toLowerCase()).toMatch(/culinary journey|authentic experience|empower|curated/);
    }
  });

  it("flags aphoristic cadence", () => {
    const result = slopCheck({
      body: "Not a restaurant. Just a feeling.",
    });
    expect(result.ok).toBe(false);
  });

  it("passes specific copy", () => {
    const result = slopCheck({
      headline: "Wood-fired pies on Via Roma",
      ctaLabel: "Reserve a table",
    });
    expect(result.ok).toBe(true);
  });
});
