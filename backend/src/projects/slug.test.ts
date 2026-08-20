import { describe, expect, it } from "vitest";
import { nextAvailableSlug, slugify } from "./slug.js";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Casa Vecchia Trattoria")).toBe("casa-vecchia-trattoria");
  });

  it("strips accents rather than the letters carrying them", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("collapses punctuation runs into a single hyphen", () => {
    expect(slugify("Joe's  Bar & Grill!!!")).toBe("joe-s-bar-grill");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  it("falls back rather than returning an empty slug", () => {
    // A name in a script we do not transliterate must still produce something
    // usable, or every such project would collide on the empty string.
    expect(slugify("日本語")).toBe("project");
    expect(slugify("!!!")).toBe("project");
  });

  it("caps length without leaving a trailing hyphen", () => {
    const slug = slugify("a".repeat(40) + " " + "b".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("nextAvailableSlug", () => {
  it("returns the base when it is free", () => {
    expect(nextAvailableSlug("cafe", new Set())).toBe("cafe");
  });

  it("appends the first free numeric suffix", () => {
    expect(nextAvailableSlug("cafe", new Set(["cafe"]))).toBe("cafe-2");
    expect(nextAvailableSlug("cafe", new Set(["cafe", "cafe-2"]))).toBe("cafe-3");
  });

  it("skips gaps rather than reusing a taken suffix", () => {
    expect(
      nextAvailableSlug("cafe", new Set(["cafe", "cafe-3"])),
    ).toBe("cafe-2");
  });

  it("never returns a slug already taken", () => {
    const taken = new Set(["cafe", ...Array.from({ length: 50 }, (_, i) => `cafe-${i + 2}`)]);
    expect(taken.has(nextAvailableSlug("cafe", taken))).toBe(false);
  });
});
