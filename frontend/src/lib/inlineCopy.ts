import { textFieldToPlain } from "@/components/premium/contentHelpers";
import type { PreviewPick } from "@/lib/resolvePreviewPick";
import type { Page, SectionType } from "@/types/page";

export type SetCopyOp = {
  op: "set_copy";
  section: SectionType;
  field: string;
  value: string;
};

/**
 * True when a preview pick maps to a copy field we can edit inline.
 */
export function canInlineEditPick(pick: PreviewPick | null): boolean {
  return Boolean(pick?.field);
}

/**
 * Builds a set_copy op, or null when the pick has no field.
 */
export function buildInlineCopyOp(
  pick: PreviewPick,
  value: string,
): SetCopyOp | null {
  if (!pick.field) return null;
  return {
    op: "set_copy",
    section: pick.section,
    field: pick.field,
    value,
  };
}

/**
 * Returns a new page with one content field replaced (optimistic preview).
 */
export function patchPageCopy(
  page: Page,
  section: SectionType,
  field: string,
  value: string,
): Page {
  return {
    ...page,
    sections: page.sections.map((entry) =>
      entry.type === section
        ? { ...entry, content: { ...entry.content, [field]: value } }
        : entry,
    ),
  };
}

/**
 * Reads the plain-text value for a pick from live page JSON.
 */
export function copyValueForPick(page: Page, pick: PreviewPick): string {
  if (!pick.field) return "";
  const section = page.sections.find((entry) => entry.type === pick.section);
  if (!section) return pick.snippet;
  return textFieldToPlain(section.content[pick.field]) || pick.snippet;
}

/**
 * Short chat remark after a successful inline text save.
 */
export function formatInlineCopyRemark(
  pick: PreviewPick,
  value: string,
): string {
  const snippet = value.replace(/\s+/g, " ").trim().slice(0, 48);
  if (snippet) return `Updated “${snippet}” in ${pick.section}.`;
  return `Updated ${pick.section}.${pick.field ?? "copy"}.`;
}
