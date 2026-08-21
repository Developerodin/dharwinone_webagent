import { describe, expect, it } from "vitest";
import { suggestionChipsForPage } from "./suggestionChips";
import type { Brief } from "../types/intake";
import type { Page, PageSection } from "../types/page";

/**
 * Minimal section stub for chip filtering tests.
 */
function section(type: PageSection["type"]): PageSection {
  return {
    type,
    componentId: `${type}-01`,
    content: {},
    assets: [],
  };
}

const brief: Brief = {
  businessName: "China Town",
  category: "restaurant",
  phone: null,
  address: "42 Grant Ave",
  menuItems: [],
  photos: [],
  brandColors: null,
  hours: [{ days: "Daily", open: "11:00", close: "22:00" }],
};

describe("suggestionChipsForPage", () => {
  it("does not chip add-menu when a menu section already exists", () => {
    const page: Page = {
      sections: [section("hero"), section("menu"), section("reservation")],
    };
    const chips = suggestionChipsForPage(page, brief);
    expect(chips.some((chip) => /add a full menu/i.test(chip))).toBe(false);
    expect(chips).toContain("Create a downloadable menu page");
    expect(chips.some((chip) => /reservation form/i.test(chip))).toBe(false);
  });

  it("offers a menu chip when the page has no menu", () => {
    const page: Page = { sections: [section("hero")] };
    const chips = suggestionChipsForPage(page, {
      ...brief,
      address: null,
      hours: [],
    });
    expect(chips).toContain("Add a full menu with prices");
    expect(chips).toContain("Set real hours and address");
  });
});
