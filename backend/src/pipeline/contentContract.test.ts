import { describe, expect, it } from "vitest";
import { checkContentContract, checkPageContentContracts } from "./contentContract.js";
import { getSpec } from "../catalog/index.js";

describe("content contracts", () => {
  it("flags a missing required field", () => {
    const violations = checkContentContract({
      componentId: "premium-hero-01",
      content: { subheading: "only this" },
    });
    expect(violations.map((v) => v.field)).toEqual(
      expect.arrayContaining(["headline", "ctaLabel"]),
    );
    expect(violations.every((v) => v.kind === "missing")).toBe(true);
  });

  it("flags copy that overruns the component's layout budget", () => {
    const spec = getSpec("premium-hero-01")!;
    const violations = checkContentContract({
      componentId: spec.id,
      content: {
        headline: "x".repeat(spec.slots.headline!.maxChars + 1),
        ctaLabel: "Reserve",
      },
    });
    const overrun = violations.find((v) => v.kind === "too_long");
    expect(overrun).toBeTruthy();
    expect(overrun!.field).toBe("headline");
    expect(overrun!.limit).toBe(spec.slots.headline!.maxChars);
  });

  it("accepts copy that fits", () => {
    expect(
      checkContentContract({
        componentId: "premium-hero-01",
        content: {
          headline: "Roman pasta, two ovens, since 1974",
          subheading: "A dining room on Via Roma Street.",
          ctaLabel: "Reserve a table",
        },
      }),
    ).toEqual([]);
  });

  it("does not flag optional fields left empty", () => {
    expect(
      checkContentContract({
        componentId: "premium-hero-01",
        content: { headline: "Wood-fired since 1974", ctaLabel: "See the menu" },
      }),
    ).toEqual([]);
  });

  it("has nothing to say about a component it does not know", () => {
    expect(
      checkContentContract({ componentId: "unknown-hero-99", content: {} }),
    ).toEqual([]);
  });

  it("checks a whole page", () => {
    const violations = checkPageContentContracts([
      { componentId: "premium-hero-01", content: {} },
      { componentId: "unknown-hero-99", content: {} },
    ]);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((v) => v.componentId === "premium-hero-01")).toBe(true);
  });
});
