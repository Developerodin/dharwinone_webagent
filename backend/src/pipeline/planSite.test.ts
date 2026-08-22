import { describe, expect, it } from "vitest";
import { planSite } from "./planSite.js";
import { classifySiteIntent, extractRequestedRoles } from "./siteIntent.js";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { SectionType } from "../schemas/page.schema.js";

const FULL: SectionType[] = [
  "header", "hero", "about", "menu", "stats", "gallery",
  "services", "reservation", "location_map", "contact", "footer",
];

/**
 * Plans a site for a prompt with the standard section set.
 */
function plan(chatText: string, sections: SectionType[] = FULL, brief: Brief = FIXTURE_BRIEF) {
  return planSite({ brief, chatText, sections });
}

describe("site intent", () => {
  it.each([
    ["I need a proper multi-page site", "multi_page"],
    ["build a full website with pages for menu, about and contact", "multi_page"],
    ["separate pages please", "multi_page"],
    ["just a single page site", "single_page"],
    ["a one-page scrolling site", "single_page"],
    ["a landing page for our opening", "landing"],
    ["coming soon page", "landing"],
    ["a nice website for my cafe", "single_page"],
    ["", "single_page"],
  ])("classifies %j as %s", (text, expected) => {
    expect(classifySiteIntent({ brief: FIXTURE_BRIEF, chatText: text }).kind).toBe(
      expected,
    );
  });

  it("reads a listed set of pages as a multi-page request", () => {
    const intent = classifySiteIntent({
      brief: FIXTURE_BRIEF,
      chatText: "pages: home, about, menu and contact",
    });
    expect(intent.kind).toBe("multi_page");
    expect(intent.requestedRoles).toEqual(
      expect.arrayContaining(["about", "menu", "contact"]),
    );
  });

  it("does not promote a passing mention of one page to multi-page", () => {
    const intent = classifySiteIntent({
      brief: FIXTURE_BRIEF,
      chatText: "we want the menu to stand out",
    });
    expect(intent.kind).toBe("single_page");
  });

  it("keeps the order the owner listed pages in", () => {
    expect(
      extractRequestedRoles("pages: contact, gallery, menu"),
    ).toEqual(["contact", "gallery", "menu"]);
  });
});

describe("planSite", () => {
  it("keeps a default request on one page", () => {
    const site = plan("a website for my cafe");
    expect(site.kind).toBe("single_page");
    expect(site.pages).toHaveLength(1);
    expect(site.pages[0]!.sections).toEqual(FULL);
  });

  it("trims a landing page to the conversion path", () => {
    const site = plan("a landing page for our opening");
    expect(site.kind).toBe("landing");
    expect(site.pages).toHaveLength(1);
    expect(site.pages[0]!.sections).not.toContain("stats");
    expect(site.pages[0]!.sections).toContain("hero");
    expect(site.pages[0]!.sections).toContain("contact");
  });

  it("splits a multi-page request into real pages", () => {
    const site = plan(
      "a proper multi-page site: home, about, menu, gallery and contact",
    );
    expect(site.kind).toBe("multi_page");
    expect(site.pages.map((page) => page.role)).toEqual([
      "home", "menu", "about", "gallery", "contact",
    ]);
    expect(site.pages.map((page) => page.path)).toContain("/menu");
  });

  it("gives every page a header and a footer", () => {
    const site = plan("multi-page site with menu, about, gallery, contact");
    for (const page of site.pages) {
      expect(page.sections[0]).toBe("header");
      expect(page.sections.at(-1)).toBe("footer");
    }
  });

  it("never places the same section on two pages except home teasers", () => {
    const site = plan("multi-page site with menu, about, gallery, contact");
    const subPages = site.pages.filter((page) => page.role !== "home");
    const seen = new Set<SectionType>();
    for (const page of subPages) {
      for (const section of page.sections) {
        if (section === "header" || section === "footer") continue;
        expect(seen.has(section)).toBe(false);
        seen.add(section);
      }
    }
  });

  it("leaves home as a complete page, not a hero and a footer", () => {
    const site = plan("multi-page site with menu, about, gallery, contact");
    const home = site.pages[0]!;
    expect(home.role).toBe("home");
    expect(home.sections).toContain("hero");
    expect(home.sections.length).toBeGreaterThanOrEqual(5);
  });

  it("falls back to one page when there is not enough to split", () => {
    const thin: SectionType[] = ["header", "hero", "about", "footer"];
    const site = plan("multi-page site please", thin);
    expect(site.kind).toBe("single_page");
    expect(site.pages).toHaveLength(1);
    expect(site.reason).toMatch(/only/);
  });

  it("only builds pages the owner named when they named any", () => {
    const site = plan("multi-page site with just a menu page and a contact page");
    const roles = site.pages.map((page) => page.role);
    expect(roles).toContain("menu");
    expect(roles).toContain("contact");
    expect(roles).not.toContain("gallery");
  });

  it("is deterministic", () => {
    const text = "multi-page site with menu, about, gallery, contact";
    expect(plan(text)).toEqual(plan(text));
  });
});
