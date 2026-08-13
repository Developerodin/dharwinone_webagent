import { describe, expect, it } from "vitest";
import { checkUnsupportedEdit } from "./checkEditCapability.js";
import { resolveThemeFamilyIntent } from "./resolveThemeIntent.js";

describe("resolveThemeFamilyIntent", () => {
  it("maps elegent typo to elegant", () => {
    expect(resolveThemeFamilyIntent("cahnge the therme to elegent")).toBe(
      "elegant",
    );
  });

  it('maps "use Elegant" to elegant', () => {
    expect(resolveThemeFamilyIntent("use Elegant")).toBe("elegant");
  });

  it("maps fine dining to elegant", () => {
    expect(resolveThemeFamilyIntent("go with fine dining")).toBe("elegant");
  });

  it("maps premum typo to premium", () => {
    expect(resolveThemeFamilyIntent("use premum theme")).toBe("premium");
  });

  it("maps light/dark language", () => {
    expect(resolveThemeFamilyIntent("make it dark")).toBe("elegant");
    expect(resolveThemeFamilyIntent("dark to light")).toBe("premium");
  });

  it("returns null for non-theme copy edits", () => {
    expect(
      resolveThemeFamilyIntent('change hero headline to "Welcome"'),
    ).toBeNull();
  });
});

describe("checkUnsupportedEdit theme exemption", () => {
  it("does not block elegant typo as custom colors", () => {
    expect(checkUnsupportedEdit("cahnge the therme to elegent")).toBeNull();
  });

  it("does not block use Elegant", () => {
    expect(checkUnsupportedEdit("use Elegant")).toBeNull();
  });

  it("allows custom brand colors (now supported)", () => {
    expect(checkUnsupportedEdit("make the buttons green")).toBeNull();
  });

  it("allows video language (uploads support video)", () => {
    expect(checkUnsupportedEdit("add a video background")).toBeNull();
  });

  it("still blocks map embeds", () => {
    expect(checkUnsupportedEdit("add a google maps embed")).toContain(
      "advanced media",
    );
  });
});
