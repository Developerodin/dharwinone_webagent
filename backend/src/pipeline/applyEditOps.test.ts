import { describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { resetCatalogCache } from "../lib/catalog.js";
import { applyEditOps } from "./applyEditOps.js";
import { parseEditOpsFixture } from "./parseEditOps.js";
import { runPipeline } from "./runPipeline.js";

describe("parseEditOpsFixture", () => {
  it("parses headline change", () => {
    const parsed = parseEditOpsFixture(
      'change hero headline to "Dragon Wok Kitchen"',
    );
    expect(parsed.ops).toContainEqual({
      op: "set_copy",
      section: "hero",
      field: "headline",
      value: "Dragon Wok Kitchen",
    });
  });

  it("parses menu price change", () => {
    const parsed = parseEditOpsFixture("set Chicken Lollipop to $12");
    expect(parsed.ops).toContainEqual({
      op: "set_menu_price",
      name: "Chicken Lollipop",
      price: 12,
    });
  });

  it("parses remove menu item", () => {
    const parsed = parseEditOpsFixture("remove Veg Spring Rolls from the menu");
    expect(parsed.ops).toContainEqual({
      op: "remove_menu_item",
      name: "Veg Spring Rolls",
    });
  });

  it("parses contact email updates", () => {
    const parsed = parseEditOpsFixture(
      "need to update email address akshay96102@gmail.com add this emaisl for cocntect us",
    );
    expect(parsed.ops).toContainEqual({
      op: "set_email",
      email: "akshay96102@gmail.com",
    });
  });

  it("parses theme switch", () => {
    const parsed = parseEditOpsFixture("use elegant theme");
    expect(parsed.ops).toContainEqual({
      op: "set_theme",
      family: "elegant",
    });
  });

  it("parses typo elegent theme switch", () => {
    const parsed = parseEditOpsFixture("cahnge the therme to elegent");
    expect(parsed.ops).toContainEqual({
      op: "set_theme",
      family: "elegant",
    });
  });

  it('parses bare "use Elegant"', () => {
    const parsed = parseEditOpsFixture("use Elegant");
    expect(parsed.ops).toContainEqual({
      op: "set_theme",
      family: "elegant",
    });
  });

  it("parses fine dining as elegant", () => {
    const parsed = parseEditOpsFixture("make it fine dining");
    expect(parsed.ops).toContainEqual({
      op: "set_theme",
      family: "elegant",
    });
  });

  it("parses premum typo as premium", () => {
    const parsed = parseEditOpsFixture("switch to premum theme");
    expect(parsed.ops).toContainEqual({
      op: "set_theme",
      family: "premium",
    });
  });

  it("parses cycle image", () => {
    const parsed = parseEditOpsFixture("use a different about image");
    expect(parsed.ops).toContainEqual({
      op: "cycle_image",
      section: "about",
      index: null,
    });
  });

  it("parses section layout cycle", () => {
    const parsed = parseEditOpsFixture("change the about section");
    expect(parsed.ops).toContainEqual({
      op: "cycle_section_component",
      section: "about",
    });
  });
});

describe("applyEditOps", () => {
  it("updates headline, price, removes menu item, cycles about image, switches theme", async () => {
    resetCatalogCache();
    const built = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "premium",
      brief: {
        ...FIXTURE_BRIEF,
        menuItems: [
          { name: "Veg Spring Rolls", price: 8, description: null },
          { name: "Chicken Lollipop", price: 10, description: null },
        ],
      },
    });

    const aboutBefore =
      built.page.sections.find((section) => section.type === "about")?.assets[0]
        ?.imagePath ?? null;

    const heroBeforeId =
      built.page.sections.find((section) => section.type === "hero")
        ?.componentId ?? "";

    const result = await applyEditOps({
      page: built.page,
      brief: built.brief,
      family: "premium",
      ops: [
        {
          op: "set_copy",
          section: "hero",
          field: "headline",
          value: "New Headline",
        },
        { op: "set_menu_price", name: "Chicken Lollipop", price: 12 },
        { op: "remove_menu_item", name: "Veg Spring Rolls" },
        { op: "cycle_image", section: "about", index: null },
        { op: "set_theme", family: "elegant" },
      ],
    });

    const hero = result.page.sections.find((section) => section.type === "hero");
    const menu = result.page.sections.find((section) => section.type === "menu");
    const about = result.page.sections.find((section) => section.type === "about");
    const items = menu?.content.items as Array<{ name: string; price: number }>;

    expect(hero?.content.headline).toBe("New Headline");
    expect(hero?.componentId).toBe(
      heroBeforeId.replace("premium-", "elegant-"),
    );
    expect(items).toEqual([{ name: "Chicken Lollipop", price: 12 }]);
    expect(result.brief.menuItems).toHaveLength(1);
    expect(result.family).toBe("elegant");
    expect(about?.assets[0]?.imagePath).toBeTruthy();
    if (aboutBefore) {
      // After theme switch images are re-picked; still must be a local webp path
      expect(about?.assets[0]?.imagePath).toMatch(
        /^\/images\/restaurant\/about\/.+\.webp$/,
      );
    }
  });

  it("backfills empty location_map assets on any edit", async () => {
    resetCatalogCache();
    const built = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "minimal",
    });
    const location = built.page.sections.find(
      (section) => section.type === "location_map",
    );
    expect(location).toBeTruthy();
    if (location) location.assets = [];

    const result = await applyEditOps({
      page: built.page,
      brief: built.brief,
      family: "minimal",
      ops: [
        {
          op: "set_copy",
          section: "location_map",
          field: "headline",
          value: "Visit Jaipur Tea",
        },
      ],
    });

    const healed = result.page.sections.find(
      (section) => section.type === "location_map",
    );
    expect(healed?.content.headline).toBe("Visit Jaipur Tea");
    expect(healed?.assets[0]?.imagePath).toMatch(
      /^\/images\/restaurant\/about\/.+\.webp$/,
    );
  });

  it("set_location writes address and coords to location/contact/footer and brief", async () => {
    resetCatalogCache();
    const built = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "premium",
    });

    const result = await applyEditOps({
      page: built.page,
      brief: built.brief,
      family: "premium",
      ops: [
        {
          op: "set_location",
          address: "1 Palace Rd, Jaipur",
          lat: 26.9124,
          lng: 75.7873,
          placeId: "abc",
          mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.9124,75.7873",
        },
      ],
    });

    expect(result.brief.address).toBe("1 Palace Rd, Jaipur");
    expect(result.brief.lat).toBe(26.9124);
    expect(result.brief.lng).toBe(75.7873);

    for (const type of ["location_map", "contact", "footer"] as const) {
      const section = result.page.sections.find((item) => item.type === type);
      expect(section?.content.address).toBe("1 Palace Rd, Jaipur");
      expect(section?.content.lat).toBe(26.9124);
      expect(section?.content.lng).toBe(75.7873);
    }
  });

  it("hydrates opening hours as strings onto contact, footer, and location_map", async () => {
    resetCatalogCache();
    const built = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "premium",
    });

    for (const type of ["location_map", "contact", "footer"] as const) {
      const section = built.page.sections.find((item) => item.type === type);
      expect(section?.content.hours).toEqual(["Mon–Sun 12:00–22:00"]);
    }
  });

  it("set_email hydrates brief plus contact/footer/reservation", async () => {
    resetCatalogCache();
    const built = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "premium",
    });

    const result = await applyEditOps({
      page: built.page,
      brief: built.brief,
      family: "premium",
      ops: [{ op: "set_email", email: "akshay96102@gmail.com" }],
    });

    expect(result.brief.email).toBe("akshay96102@gmail.com");
    expect(result.notes.join(" ")).toMatch(/akshay96102@gmail.com/);
    for (const type of ["contact", "footer", "reservation"] as const) {
      const section = result.page.sections.find((item) => item.type === type);
      expect(section?.content.email).toBe("akshay96102@gmail.com");
    }
  });

  it("set_email rejects placeholder inboxes", async () => {
    resetCatalogCache();
    const built = await runPipeline({
      chatText: "ignored",
      useFixture: true,
      family: "premium",
    });

    const result = await applyEditOps({
      page: built.page,
      brief: built.brief,
      family: "premium",
      ops: [{ op: "set_email", email: "hello@example.com" }],
    });

    expect(result.brief.email).toBe("reservations@nonnarosa.com");
    expect(result.notes.join(" ")).toMatch(/isn't usable/i);
  });
});
