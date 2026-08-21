import { describe, expect, it } from "vitest";
import {
  buildInlineCopyOp,
  canInlineEditPick,
  formatInlineCopyRemark,
  patchPageCopy,
} from "./inlineCopy";
import type { PreviewPick } from "./resolvePreviewPick";
import type { Page } from "../types/page";

const ctaPick: PreviewPick = {
  section: "hero",
  field: "ctaLabel",
  tag: "button",
  snippet: "BOOK A TABLE",
};

const sectionPick: PreviewPick = {
  section: "hero",
  tag: "section",
  snippet: "",
};

describe("inline copy payload", () => {
  it("builds set_copy for a mapped field", () => {
    expect(buildInlineCopyOp(ctaPick, "Book tonight")).toEqual({
      op: "set_copy",
      section: "hero",
      field: "ctaLabel",
      value: "Book tonight",
    });
  });

  it("does not commit when the click has no field", () => {
    expect(canInlineEditPick(sectionPick)).toBe(false);
    expect(buildInlineCopyOp(sectionPick, "nope")).toBeNull();
  });

  it("patches only the targeted content field", () => {
    const page: Page = {
      sections: [
        {
          type: "hero",
          componentId: "hero-01",
          content: { ctaLabel: "BOOK A TABLE", headline: "Fire" },
          assets: [],
        },
      ],
    };
    const next = patchPageCopy(page, "hero", "ctaLabel", "Reserve");
    expect(next.sections[0]?.content.ctaLabel).toBe("Reserve");
    expect(next.sections[0]?.content.headline).toBe("Fire");
    expect(page.sections[0]?.content.ctaLabel).toBe("BOOK A TABLE");
  });

  it("patches a nested menu item name", () => {
    const page: Page = {
      sections: [
        {
          type: "menu",
          componentId: "elegant-menu-01",
          content: {
            items: [{ name: "Margherita Pizza", price: 350 }],
          },
          assets: [],
        },
      ],
    };
    const next = patchPageCopy(page, "menu", "items.0.name", "Margherita");
    const items = next.sections[0]?.content.items as Array<{ name: string }>;
    expect(items[0]?.name).toBe("Margherita");
  });

  it("formats a short remark", () => {
    expect(formatInlineCopyRemark(ctaPick, "BOOK A TABLE")).toBe(
      "Updated “BOOK A TABLE” in hero.",
    );
  });
});
