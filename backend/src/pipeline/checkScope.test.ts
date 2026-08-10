import { describe, expect, it } from "vitest";
import {
  checkScope,
  checkThemeEditScope,
  formatUnsupportedCategoryMessage,
} from "./checkScope.js";

describe("checkScope", () => {
  it("allows restaurant briefs", () => {
    expect(
      checkScope({
        chatText: "Dragon Wok Chinese restaurant in Kolkata with spring rolls",
      }).ok,
    ).toBe(true);
  });

  it("blocks hotel verticals with a friendly message", () => {
    const result = checkScope({
      chatText: "Build a website for my boutique hotel with spa",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("vertical");
      expect(result.message).toContain("isn't available yet");
      expect(result.message).toContain("coming soon");
      expect(result.message).toContain("Premium");
    }
  });

  it("blocks salon when category is salon", () => {
    const result = checkScope({
      chatText: "My business is Glow Up",
      category: "Hair salon",
    });
    expect(result.ok).toBe(false);
  });

  it("blocks unsupported theme requests", () => {
    const result = checkScope({
      chatText: "Cafe Luna — make it a cyberpunk neon theme please",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("theme");
      expect(result.message).toContain("Elegant");
    }
  });
});

describe("checkThemeEditScope", () => {
  it("allows premium/elegant switches", () => {
    expect(checkThemeEditScope("use elegant theme").ok).toBe(true);
  });

  it('allows "use Elegant" without the word theme', () => {
    expect(checkThemeEditScope("use Elegant").ok).toBe(true);
  });

  it("allows typo elegent theme requests", () => {
    expect(checkThemeEditScope("cahnge the therme to elegent").ok).toBe(true);
  });

  it("blocks unknown theme names", () => {
    const result = checkThemeEditScope("use industrial theme");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("coming soon");
    }
  });
});

describe("formatUnsupportedCategoryMessage", () => {
  it("lists what we offer now", () => {
    const message = formatUnsupportedCategoryMessage("hotel");
    expect(message).toContain("restaurant & cafe");
    expect(message).toContain("Thank you");
  });
});
