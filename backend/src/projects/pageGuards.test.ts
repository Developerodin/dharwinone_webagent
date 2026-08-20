import { describe, expect, it } from "vitest";
import {
  assertNoDataUrls,
  assertPageSize,
  extractAssetPaths,
  resolveProjectName,
  validatePage,
} from "./pageGuards.js";
import { HttpError } from "../lib/httpError.js";

/**
 * Builds a minimal valid page.
 */
function page(overrides: Record<string, unknown> = {}) {
  return {
    sections: [
      {
        type: "hero",
        componentId: "PremiumHero01",
        content: { headline: "Casa Vecchia" },
        assets: [{ key: "primary", imagePath: "/images/hero.jpg" }],
      },
    ],
    ...overrides,
  };
}

/**
 * Runs a guard and returns the HttpError it threw, or null.
 */
function guardError(run: () => unknown): HttpError | null {
  try {
    run();
    return null;
  } catch (error) {
    return error as HttpError;
  }
}

describe("assertNoDataUrls", () => {
  it("accepts a page referencing assets by path", () => {
    expect(guardError(() => assertNoDataUrls(page()))).toBeNull();
  });

  it("rejects a data URL in assets", () => {
    const bad = page({
      sections: [
        {
          type: "hero",
          componentId: "X",
          content: {},
          assets: [{ key: "primary", imagePath: "data:image/png;base64,AAAA" }],
        },
      ],
    });
    expect(guardError(() => assertNoDataUrls(bad))?.code).toBe(
      "DATA_URL_REJECTED",
    );
  });

  it("rejects a data URL hidden deep inside section content", () => {
    // The whole reason the scanner is recursive: `content` is a free-form
    // record, so a base64 blob can appear anywhere, not just in assets[].
    const bad = page({
      sections: [
        {
          type: "hero",
          componentId: "X",
          content: {
            background: { layers: [{ src: "data:image/jpeg;base64,ZZZZ" }] },
          },
          assets: [],
        },
      ],
    });
    expect(guardError(() => assertNoDataUrls(bad))?.code).toBe(
      "DATA_URL_REJECTED",
    );
  });

  it("names the offending field so the error is actionable", () => {
    const bad = page({
      sections: [
        {
          type: "hero",
          componentId: "X",
          content: { logo: "data:image/png;base64,AA" },
          assets: [],
        },
      ],
    });
    const error = guardError(() => assertNoDataUrls(bad));
    expect(String(error?.details?.field)).toContain("logo");
  });

  it("rejects javascript: and vbscript: URLs", () => {
    for (const scheme of ["javascript:alert(1)", "vbscript:msgbox"]) {
      const bad = page({ themeOverrides: { accent: scheme } });
      expect(guardError(() => assertNoDataUrls(bad))?.code).toBe(
        "DATA_URL_REJECTED",
      );
    }
  });

  it("is not fooled by leading whitespace or mixed case", () => {
    const bad = page({ themeOverrides: { accent: "  DaTa:text/html,x" } });
    expect(guardError(() => assertNoDataUrls(bad))?.code).toBe(
      "DATA_URL_REJECTED",
    );
  });

  it("allows ordinary strings that merely contain the word data", () => {
    const fine = page({ themeOverrides: { fontBody: "metadata sans" } });
    expect(guardError(() => assertNoDataUrls(fine))).toBeNull();
  });
});

describe("assertPageSize", () => {
  it("accepts a normal document", () => {
    expect(assertPageSize(page())).toBeGreaterThan(0);
  });

  it("rejects a document past the cap", () => {
    const huge = page({ blob: "x".repeat(1024 * 1024 + 100) });
    const error = guardError(() => assertPageSize(huge));
    expect(error?.code).toBe("PAGE_TOO_LARGE");
    expect(error?.status).toBe(413);
  });
});

describe("validatePage", () => {
  it("returns the parsed page and its size", () => {
    const result = validatePage(page());
    expect(result.page.sections).toHaveLength(1);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it("rejects a structurally invalid page", () => {
    expect(guardError(() => validatePage({ sections: "nope" }))?.code).toBe(
      "INVALID_PAGE",
    );
  });

  it("checks size before schema, so a huge blob is not a wall of zod issues", () => {
    const huge = { sections: "nope", blob: "x".repeat(1024 * 1024 + 100) };
    expect(guardError(() => validatePage(huge))?.code).toBe("PAGE_TOO_LARGE");
  });
});

describe("extractAssetPaths", () => {
  it("finds uploaded asset paths anywhere in the document", () => {
    const found = extractAssetPaths(
      page({
        sections: [
          {
            type: "hero",
            componentId: "X",
            content: { bg: "/images/uploads/a.jpg" },
            assets: [{ key: "p", imagePath: "/images/uploads/b.jpg" }],
          },
        ],
      }),
    );
    expect(found.sort()).toEqual([
      "/images/uploads/a.jpg",
      "/images/uploads/b.jpg",
    ]);
  });

  it("ignores catalog images that are not user uploads", () => {
    expect(extractAssetPaths(page())).toEqual([]);
  });

  it("de-duplicates repeated references", () => {
    const found = extractAssetPaths({
      sections: [
        {
          type: "gallery",
          componentId: "X",
          content: { a: "/images/uploads/x.jpg", b: "/images/uploads/x.jpg" },
          assets: [],
        },
      ],
    });
    expect(found).toEqual(["/images/uploads/x.jpg"]);
  });
});

describe("resolveProjectName", () => {
  it("prefers the brief's business name", () => {
    expect(resolveProjectName({ businessName: "Casa Vecchia" }, page())).toBe(
      "Casa Vecchia",
    );
  });

  it("falls back to the hero headline", () => {
    expect(resolveProjectName(null, page())).toBe("Casa Vecchia");
  });

  it("falls back to a placeholder when there is nothing to use", () => {
    expect(resolveProjectName(null, { sections: [] })).toBe("Untitled project");
  });

  it("ignores a blank business name", () => {
    expect(resolveProjectName({ businessName: "   " }, page())).toBe(
      "Casa Vecchia",
    );
  });
});
