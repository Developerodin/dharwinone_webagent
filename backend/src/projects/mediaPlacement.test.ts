import { describe, expect, it } from "vitest";
import { placeAsset, resolveAssetKey } from "./mediaPlacement.js";

/**
 * Builds a minimal page with the given sections.
 */
function page(
  sections: Array<{ type: string; assets: Array<{ key: string; imagePath: string }> }>,
) {
  return { sections };
}

describe("resolveAssetKey", () => {
  it("keeps an explicit key", () => {
    const doc = page([{ type: "gallery", assets: [] }]);
    expect(resolveAssetKey(doc, "gallery", "gallery-4")).toBe("gallery-4");
  });

  it("defaults non-gallery sections to the single primary slot", () => {
    const doc = page([{ type: "hero", assets: [] }]);
    expect(resolveAssetKey(doc, "hero")).toBe("primary");
  });

  it("appends past the existing gallery frames", () => {
    const doc = page([
      {
        type: "gallery",
        assets: [
          { key: "gallery-0", imagePath: "a.jpg" },
          { key: "gallery-1", imagePath: "b.jpg" },
        ],
      },
    ]);
    expect(resolveAssetKey(doc, "gallery")).toBe("gallery-2");
  });

  it("starts at zero when the gallery section is missing", () => {
    expect(resolveAssetKey(page([]), "gallery")).toBe("gallery-0");
  });
});

describe("placeAsset", () => {
  it("replaces the asset already in the slot", () => {
    const doc = page([
      { type: "hero", assets: [{ key: "primary", imagePath: "old.jpg" }] },
    ]);

    placeAsset(doc, "hero", "primary", "new.jpg");

    expect(doc.sections[0]!.assets).toEqual([
      { key: "primary", imagePath: "new.jpg" },
    ]);
  });

  it("replaces rather than accumulates on a single-slot section", () => {
    const doc = page([
      { type: "about", assets: [{ key: "primary", imagePath: "old.jpg" }] },
    ]);

    placeAsset(doc, "about", "hero-2", "new.jpg");

    expect(doc.sections[0]!.assets).toEqual([
      { key: "hero-2", imagePath: "new.jpg" },
    ]);
  });

  it("appends a new gallery frame", () => {
    const doc = page([
      { type: "gallery", assets: [{ key: "gallery-0", imagePath: "a.jpg" }] },
    ]);

    placeAsset(doc, "gallery", "gallery-1", "b.jpg");

    expect(doc.sections[0]!.assets).toEqual([
      { key: "gallery-0", imagePath: "a.jpg" },
      { key: "gallery-1", imagePath: "b.jpg" },
    ]);
  });

  it("overwrites an existing gallery frame by key", () => {
    const doc = page([
      {
        type: "gallery",
        assets: [
          { key: "gallery-0", imagePath: "a.jpg" },
          { key: "gallery-1", imagePath: "b.jpg" },
        ],
      },
    ]);

    placeAsset(doc, "gallery", "gallery-0", "replaced.jpg");

    expect(doc.sections[0]!.assets).toEqual([
      { key: "gallery-0", imagePath: "replaced.jpg" },
      { key: "gallery-1", imagePath: "b.jpg" },
    ]);
  });

  it("rejects a section the page does not have", () => {
    expect(() => placeAsset(page([]), "hero", "primary", "a.jpg")).toThrow(
      /no hero section/i,
    );
  });

  it("leaves other sections untouched", () => {
    const doc = page([
      { type: "hero", assets: [{ key: "primary", imagePath: "hero.jpg" }] },
      { type: "about", assets: [{ key: "primary", imagePath: "about.jpg" }] },
    ]);

    placeAsset(doc, "about", "primary", "new.jpg");

    expect(doc.sections[0]!.assets).toEqual([
      { key: "primary", imagePath: "hero.jpg" },
    ]);
  });
});
