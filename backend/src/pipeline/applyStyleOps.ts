import type { PageFamily } from "../config/pageFamily.js";
import type { EditOp } from "../schemas/editOps.schema.js";
import type { Page, PageSection, SectionType } from "../schemas/page.schema.js";
import {
  contrastForAccent,
  deriveSurfaceTokens,
  resolveColor,
  resolveFont,
} from "./colorResolve.js";
import { applyMatchColor } from "./textRuns.js";

/**
 * Finds a section by type.
 */
function findSection(
  sections: PageSection[],
  type: SectionType,
): PageSection | null {
  return sections.find((section) => section.type === type) ?? null;
}

/**
 * Fills bgDark/card/muted/onDark so light palettes stay readable on dark shells.
 */
function mergeSurfaceTokens(next: NonNullable<Page["themeOverrides"]>): void {
  const surfaces = deriveSurfaceTokens({
    bg: next.bg,
    ink: next.ink,
    bgAlt: next.bgAlt,
  });
  if (!surfaces) return;
  next.bgDark = surfaces.bgDark;
  next.card = surfaces.card;
  next.muted = surfaces.muted;
  next.onDark = surfaces.onDark;
  if (!next.bgAlt && surfaces.bgAlt) next.bgAlt = surfaces.bgAlt;
}

/**
 * Applies page-level theme token overrides.
 */
export function applyThemeTokensOp(
  page: Page,
  op: Extract<EditOp, { op: "set_theme_tokens" }>,
): string {
  const next = { ...(page.themeOverrides ?? {}) };
  const notes: string[] = [];

  if (op.accent) {
    const accent = resolveColor(op.accent);
    if (!accent) return `Could not resolve accent color “${op.accent}”.`;
    next.accent = accent;
    next.accentContrast =
      (op.accentContrast && resolveColor(op.accentContrast)) ||
      contrastForAccent(accent);
    notes.push(`accent ${accent}`);
  } else if (op.accentContrast) {
    const contrast = resolveColor(op.accentContrast);
    if (!contrast) return `Could not resolve contrast color “${op.accentContrast}”.`;
    next.accentContrast = contrast;
    notes.push(`accent contrast ${contrast}`);
  }

  for (const key of ["bg", "bgAlt", "ink"] as const) {
    const raw = op[key];
    if (!raw) continue;
    const resolved = resolveColor(raw);
    if (!resolved) return `Could not resolve ${key} color “${raw}”.`;
    next[key] = resolved;
    notes.push(`${key} ${resolved}`);
  }

  if (op.fontDisplay) {
    const font = resolveFont(op.fontDisplay) ?? op.fontDisplay;
    next.fontDisplay = font;
    notes.push(`display font`);
  }
  if (op.fontBody) {
    const font = resolveFont(op.fontBody) ?? op.fontBody;
    next.fontBody = font;
    notes.push(`body font`);
  }

  if (next.bg || next.ink) {
    mergeSurfaceTokens(next);
  }

  page.themeOverrides = next;
  return notes.length > 0
    ? `Updated site colors/fonts (${notes.join(", ")}).`
    : "No theme token changes applied.";
}

/**
 * Applies per-section style overrides.
 */
export function applySectionStyleOp(
  page: Page,
  op: Extract<EditOp, { op: "set_section_style" }>,
): string {
  const section = findSection(page.sections, op.section);
  if (!section) return `No ${op.section} section to style.`;

  const next = { ...(section.styleOverrides ?? {}) };
  const notes: string[] = [];

  for (const key of ["background", "text", "button"] as const) {
    const raw = op[key];
    if (!raw) continue;
    const resolved = resolveColor(raw);
    if (!resolved) return `Could not resolve ${key} color “${raw}”.`;
    next[key] = resolved;
    notes.push(`${key} ${resolved}`);
  }

  if (op.paddingY) {
    next.paddingY = op.paddingY;
    notes.push(`spacing ${op.paddingY}`);
  }

  section.styleOverrides = next;
  return notes.length
    ? `Updated ${op.section} style (${notes.join(", ")}).`
    : `No style changes for ${op.section}.`;
}

/**
 * Colors a substring inside a copy field.
 */
export function applyTextStyleOp(
  page: Page,
  op: Extract<EditOp, { op: "set_text_style" }>,
): string {
  const section = findSection(page.sections, op.section);
  if (!section) return `No ${op.section} section for text style.`;

  const color = resolveColor(op.color);
  if (!color) return `Could not resolve text color “${op.color}”.`;

  const current = section.content[op.field];
  const styled = applyMatchColor(current, op.match, color);
  if (!styled) {
    return `Could not find “${op.match}” in ${op.section}.${op.field}.`;
  }

  section.content = { ...section.content, [op.field]: styled };
  return `Colored “${op.match}” ${color} in ${op.section}.${op.field}.`;
}

/**
 * Applies spacing shortcut op.
 */
export function applySectionSpacingOp(
  page: Page,
  op: Extract<EditOp, { op: "set_section_spacing" }>,
): string {
  return applySectionStyleOp(page, {
    op: "set_section_style",
    section: op.section,
    background: null,
    text: null,
    button: null,
    paddingY: op.paddingY,
  });
}

/**
 * Seeds page themeOverrides from brief brand colors (build-time).
 */
export function seedThemeOverridesFromBrief(
  page: Page,
  brandColors: string[] | null | undefined,
): void {
  if (!brandColors?.length) return;
  const accent = resolveColor(brandColors[0] ?? "");
  if (!accent) return;
  const next = {
    ...(page.themeOverrides ?? {}),
    accent,
    accentContrast: contrastForAccent(accent),
  };
  if (brandColors[1]) {
    const bg = resolveColor(brandColors[1]);
    if (bg) next.bg = bg;
  }
  if (brandColors[2]) {
    const ink = resolveColor(brandColors[2]);
    if (ink) next.ink = ink;
  }
  if (next.bg || next.ink) mergeSurfaceTokens(next);
  page.themeOverrides = next;
}

/** Re-export for callers that need family typing. */
export type { PageFamily };
