import { describe, expect, it } from "vitest";
import { detectSkipIntent } from "./skipIntent.js";

describe("detectSkipIntent", () => {
  it("detects skip for now", () => {
    expect(detectSkipIntent("skip for now")).toBe(true);
    expect(detectSkipIntent("Skip")).toBe(true);
  });

  it("detects continue without / don't have", () => {
    expect(detectSkipIntent("continue without phone")).toBe(true);
    expect(detectSkipIntent("I don't have the address")).toBe(true);
  });

  it("ignores normal answers", () => {
    expect(detectSkipIntent("The phone is 555-1234")).toBe(false);
    expect(detectSkipIntent("Dragon Wok Chinese restaurant")).toBe(false);
  });
});
