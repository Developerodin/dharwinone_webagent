import type { PageFamily } from "../config/pageFamily.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { EditOp } from "../schemas/editOps.schema.js";
import type { Page, SectionType } from "../schemas/page.schema.js";
import {
  createDefaultSection,
  navLabelForSection,
} from "./defaultSection.js";

const PROTECTED_SECTIONS: SectionType[] = ["header", "footer"];

/**
 * Inserts a section before contact/footer when possible.
 */
function insertIndexFor(page: Page, type: SectionType): number {
  if (type === "header") return 0;
  if (type === "footer") return page.sections.length;

  const contactIdx = page.sections.findIndex((s) => s.type === "contact");
  const footerIdx = page.sections.findIndex((s) => s.type === "footer");
  if (contactIdx >= 0) return contactIdx;
  if (footerIdx >= 0) return footerIdx;
  return page.sections.length;
}

/**
 * Syncs header/footer nav after add/remove.
 */
function syncNav(page: Page): void {
  const present = new Set(page.sections.map((section) => section.type));
  for (const section of page.sections) {
    if (section.type !== "header" && section.type !== "footer") continue;
    const existing = Array.isArray(section.content.navItems)
      ? section.content.navItems
      : [];
    const filtered = existing.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { target?: unknown }).target === "string" &&
        present.has((item as { target: SectionType }).target),
    );

    const knownTargets = new Set(
      filtered
        .map((item) =>
          typeof item === "object" && item !== null
            ? (item as { target?: string }).target
            : null,
        )
        .filter((t): t is string => typeof t === "string"),
    );

    for (const type of present) {
      const label = navLabelForSection(type);
      if (!label || knownTargets.has(type)) continue;
      filtered.push({ label, target: type });
    }

    section.content = { ...section.content, navItems: filtered };
  }
}

/**
 * Adds a missing section with default content/assets.
 */
export function applyAddSectionOp(
  page: Page,
  brief: Brief,
  family: PageFamily,
  op: Extract<EditOp, { op: "add_section" }>,
): string {
  if (page.sections.some((section) => section.type === op.section)) {
    return `${op.section} section already exists.`;
  }

  const section = createDefaultSection(op.section, family, brief);
  const index = insertIndexFor(page, op.section);
  page.sections.splice(index, 0, section);
  syncNav(page);
  return `Added ${op.section} section.`;
}

/**
 * Removes a section (header/footer protected).
 */
export function applyRemoveSectionOp(
  page: Page,
  op: Extract<EditOp, { op: "remove_section" }>,
): string {
  if (PROTECTED_SECTIONS.includes(op.section)) {
    return `Cannot remove the ${op.section} section.`;
  }

  const before = page.sections.length;
  page.sections = page.sections.filter((section) => section.type !== op.section);
  if (page.sections.length === before) {
    return `No ${op.section} section to remove.`;
  }
  syncNav(page);
  return `Removed ${op.section} section.`;
}

/**
 * Moves a section to an absolute index, keeping header first and footer last
 * unless those sections themselves are being moved.
 */
export function applyReorderSectionOp(
  page: Page,
  op: Extract<EditOp, { op: "reorder_section" }>,
): string {
  const fromIndex = page.sections.findIndex(
    (section) => section.type === op.section,
  );
  if (fromIndex < 0) {
    return `No ${op.section} section to reorder.`;
  }

  const [moved] = page.sections.splice(fromIndex, 1);
  if (!moved) return `No ${op.section} section to reorder.`;

  let toIndex = Math.max(0, Math.min(op.toIndex, page.sections.length));
  page.sections.splice(toIndex, 0, moved);

  // Enforce shell order: header at 0, footer at end (unless moving them).
  const headerIdx = page.sections.findIndex((s) => s.type === "header");
  if (headerIdx > 0 && op.section !== "header") {
    const [header] = page.sections.splice(headerIdx, 1);
    if (header) page.sections.unshift(header);
  }
  const footerIdx = page.sections.findIndex((s) => s.type === "footer");
  if (
    footerIdx >= 0 &&
    footerIdx !== page.sections.length - 1 &&
    op.section !== "footer"
  ) {
    const [footer] = page.sections.splice(footerIdx, 1);
    if (footer) page.sections.push(footer);
  }

  syncNav(page);
  const finalIndex = page.sections.findIndex((s) => s.type === op.section);
  return `Moved ${op.section} to position ${finalIndex + 1}.`;
}
