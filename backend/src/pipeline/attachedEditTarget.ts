/**
 * Helpers for click-scoped chat edits (`[Attached target: …]` prefix).
 */

import type { EditOp } from "../schemas/editOps.schema.js";

/**
 * Strips the composer attached-target prefix so regex parsers see the user text.
 */
export function userTextFromEditInstruction(instruction: string): string {
  return instruction.replace(/^\[Attached target:[^\]]*\]\s*/i, "").trim();
}

/**
 * True when the instruction is a section chrome change, not a copy rewrite.
 */
export function isSectionChromeIntent(instruction: string): boolean {
  const text = userTextFromEditInstruction(instruction);
  if (!text) return false;
  const chrome =
    /\b(background|bg|padding|spacing|tighter|roomier|layout|image|photo|picture)\b/i.test(
      text,
    );
  const copy =
    /\b(rewrite|rephrase|headline|subheading|wording|copy|cta|button text|say )\b/i.test(
      text,
    );
  return chrome && !copy;
}

/**
 * Drops copy rewrites when the user only asked for chrome (bg/layout/image).
 */
export function dropStrayCopyOps(
  ops: EditOp[],
  instruction: string,
): EditOp[] {
  if (!isSectionChromeIntent(instruction)) return ops;
  const withoutCopy = ops.filter(
    (op) => op.op !== "set_copy" && op.op !== "rewrite_copy",
  );
  return withoutCopy.length > 0 ? withoutCopy : ops;
}
