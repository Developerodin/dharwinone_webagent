import { describe, expect, it } from "vitest";
import {
  dropStrayCopyOps,
  isSectionChromeIntent,
  userTextFromEditInstruction,
} from "./attachedEditTarget.js";
import {
  extractColorFromText,
  extractQuotedReplacement,
  parseTargetedEditOpsFixture,
} from "./parseTargetedEditOps.js";
import type { EditOp } from "../schemas/editOps.schema.js";

describe("userTextFromEditInstruction", () => {
  it("strips the attached-target prefix", () => {
    expect(
      userTextFromEditInstruction(
        '[Attached target: gallery.headline tag=h2 text="Moments"]\nchange background to black',
      ),
    ).toBe("change background to black");
  });
});

describe("extractColorFromText", () => {
  it("finds named and hex colors", () => {
    expect(extractColorFromText("make this gold")).toBe("gold");
    expect(extractColorFromText("background to #111")).toBe("#111");
    expect(extractColorFromText("rewrite the headline")).toBeNull();
  });
});

describe("extractQuotedReplacement", () => {
  it("reads change-this-to copy", () => {
    expect(extractQuotedReplacement('change this to "Book tonight"')).toBe(
      "Book tonight",
    );
    expect(extractQuotedReplacement("make this to Reserve now")).toBe(
      "Reserve now",
    );
    expect(extractQuotedReplacement("make this gold")).toBeNull();
  });
});

describe("parseTargetedEditOpsFixture", () => {
  it("sets section background without naming the section", () => {
    const parsed = parseTargetedEditOpsFixture({
      instruction:
        '[Attached target: gallery.section tag=section]\nchange background to black',
      targetSection: "gallery",
    });
    expect(parsed.ops).toContainEqual({
      op: "set_section_style",
      section: "gallery",
      background: "black",
      text: null,
      button: null,
      paddingY: null,
    });
    expect(parsed.ops.some((op) => op.op === "rewrite_copy")).toBe(false);
  });

  it("colors a picked headline, not the whole page", () => {
    const parsed = parseTargetedEditOpsFixture({
      instruction:
        '[Attached target: hero.headline tag=h1 text="Taste The Difference"]\nmake this gold',
      targetSection: "hero",
      targetField: "headline",
    });
    expect(parsed.ops).toContainEqual({
      op: "set_text_style",
      section: "hero",
      field: "headline",
      match: "Taste The Difference",
      color: "gold",
    });
  });

  it("colors a picked button via section button token", () => {
    const parsed = parseTargetedEditOpsFixture({
      instruction:
        '[Attached target: hero.ctaLabel tag=button text="Reserve a table"]\nmake this gold',
      targetSection: "hero",
      targetField: "ctaLabel",
    });
    expect(parsed.ops).toContainEqual({
      op: "set_section_style",
      section: "hero",
      background: null,
      text: null,
      button: "gold",
      paddingY: null,
    });
  });

  it("replaces picked CTA copy", () => {
    const parsed = parseTargetedEditOpsFixture({
      instruction:
        '[Attached target: hero.ctaLabel tag=button text="Reserve a table"]\nchange this to "Book tonight"',
      targetSection: "hero",
      targetField: "ctaLabel",
    });
    expect(parsed.ops).toContainEqual({
      op: "set_copy",
      section: "hero",
      field: "ctaLabel",
      value: "Book tonight",
    });
  });

  it("cycles layout for the attached section", () => {
    const parsed = parseTargetedEditOpsFixture({
      instruction:
        "[Attached target: about.section tag=section]\nswitch layout",
      targetSection: "about",
    });
    expect(parsed.ops).toContainEqual({
      op: "cycle_section_component",
      section: "about",
    });
  });

  it("darkens picked text when no named color is given", () => {
    const parsed = parseTargetedEditOpsFixture({
      instruction:
        '[Attached target: hero.headline tag=h1 text="Taste The Difference"]\nmake this darker',
      targetSection: "hero",
      targetField: "headline",
    });
    expect(parsed.ops).toContainEqual({
      op: "set_text_style",
      section: "hero",
      field: "headline",
      match: "Taste The Difference",
      color: "charcoal",
    });
  });
});

describe("dropStrayCopyOps", () => {
  it("keeps style ops and drops a rewrite when the ask is background", () => {
    const ops: EditOp[] = [
      {
        op: "rewrite_copy",
        section: "hero",
        field: "headline",
        maxWords: null,
        hint: "change background to black",
      },
      {
        op: "set_section_style",
        section: "hero",
        background: "black",
        text: null,
        button: null,
        paddingY: null,
      },
    ];
    expect(isSectionChromeIntent("change background to black")).toBe(true);
    expect(dropStrayCopyOps(ops, "change background to black")).toEqual([
      ops[1],
    ]);
  });
});
