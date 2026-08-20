import type { EditOp } from "../schemas/editOps.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import { dropStrayCopyOps } from "./attachedEditTarget.js";

const COPY_FIELD_OPS = new Set<EditOp["op"]>([
  "set_copy",
  "rewrite_copy",
  "set_text_style",
]);

/**
 * Forces click-scoped edits onto the picked section (and copy field).
 */
export function pinTargetedEditOps(
  ops: EditOp[],
  targetSection: SectionType,
  targetField?: string,
  instruction?: string,
): EditOp[] {
  const scoped = instruction ? dropStrayCopyOps(ops, instruction) : ops;
  return scoped.map((op) => {
    let next = op;
    if (
      "section" in next &&
      typeof next.section === "string" &&
      next.section !== targetSection
    ) {
      next = { ...next, section: targetSection } as EditOp;
    }
    if (
      targetField &&
      COPY_FIELD_OPS.has(next.op) &&
      "field" in next &&
      next.field !== targetField
    ) {
      next = { ...next, field: targetField } as EditOp;
    }
    return next;
  });
}
