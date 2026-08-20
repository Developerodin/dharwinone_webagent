import { describe, expect, it } from "vitest";
import { pinTargetedEditOps } from "./pinTargetedEditOps.js";
import type { EditOp } from "../schemas/editOps.schema.js";

describe("pinTargetedEditOps", () => {
  it("remaps rewrite_copy field when the pick is a CTA, not the headline", () => {
    const ops: EditOp[] = [
      {
        op: "rewrite_copy",
        section: "about",
        field: "headline",
        maxWords: 12,
        hint: "make this gold",
      },
    ];
    expect(pinTargetedEditOps(ops, "hero", "ctaLabel")).toEqual([
      {
        op: "rewrite_copy",
        section: "hero",
        field: "ctaLabel",
        maxWords: 12,
        hint: "make this gold",
      },
    ]);
  });

  it("remaps set_copy field and section together", () => {
    const ops: EditOp[] = [
      {
        op: "set_copy",
        section: "footer",
        field: "body",
        value: "Book tonight",
      },
    ];
    expect(pinTargetedEditOps(ops, "hero", "ctaLabel")).toEqual([
      {
        op: "set_copy",
        section: "hero",
        field: "ctaLabel",
        value: "Book tonight",
      },
    ]);
  });

  it("leaves field alone when no targetField is set", () => {
    const ops: EditOp[] = [
      {
        op: "rewrite_copy",
        section: "hero",
        field: "headline",
        maxWords: null,
        hint: "shorter",
      },
    ];
    expect(pinTargetedEditOps(ops, "hero")).toEqual(ops);
  });

  it("pins section style and drops a stray rewrite on a background ask", () => {
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
    expect(
      pinTargetedEditOps(
        ops,
        "gallery",
        "headline",
        "change background to black",
      ),
    ).toEqual([
      {
        op: "set_section_style",
        section: "gallery",
        background: "black",
        text: null,
        button: null,
        paddingY: null,
      },
    ]);
  });
});
