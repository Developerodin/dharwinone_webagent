import { textFieldToPlain } from "@/components/premium/contentHelpers";
import type { PageSection, SectionType } from "@/types/page";

const SNIPPET_MAX = 80;
const MIN_SNIPPET = 2;

const SEMANTIC_TAGS = new Set([
  "button",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "img",
  "label",
  "li",
  "blockquote",
  "figcaption",
  "input",
  "textarea",
]);

const FIELD_LABELS: Record<string, string> = {
  headline: "headline",
  subheading: "subheading",
  body: "body",
  ctaLabel: "CTA",
  caption: "caption",
  introText: "intro",
  sectionTitle: "title",
  directionsNote: "directions",
};

export type PreviewPick = {
  section: SectionType;
  field?: string;
  tag: string;
  snippet: string;
};

type ContentField = { field: string; value: string };

/**
 * Human label for a content field key (chip / aria).
 */
export function fieldLabelFor(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/**
 * Flattens string / styled-run content keys for field matching.
 */
export function collectContentFields(
  content: Record<string, unknown>,
): ContentField[] {
  const out: ContentField[] = [];
  for (const [field, raw] of Object.entries(content)) {
    const plain = textFieldToPlain(raw).replace(/\s+/g, " ").trim();
    if (plain) out.push({ field, value: plain });
    if (Array.isArray(raw) && raw.every((item) => typeof item === "string")) {
      const joined = raw
        .map((item) => item.trim())
        .filter(Boolean)
        .join("\n");
      if (joined && joined !== plain) {
        out.push({ field, value: joined });
      }
    }
  }
  return out;
}

/**
 * Picks the best content field for clicked text, scoped to one section.
 *
 * Exact match wins. If several fields contain the snippet, the closest length
 * wins (CTA over body). Container clicks that wrap multiple fields return none.
 */
export function matchSectionField(
  content: Record<string, unknown>,
  snippet: string,
  clickedSectionRoot = false,
): string | undefined {
  if (clickedSectionRoot) return undefined;
  const cleaned = snippet.replace(/\s+/g, " ").trim();
  if (cleaned.length < MIN_SNIPPET) return undefined;

  const fields = collectContentFields(content);
  if (fields.length === 0) return undefined;

  const lower = cleaned.toLowerCase();

  const exact = fields.filter((entry) => entry.value.toLowerCase() === lower);
  if (exact.length > 0) {
    exact.sort((a, b) => a.value.length - b.value.length);
    return exact[0]?.field;
  }

  const containedInSnippet = fields.filter((entry) =>
    lower.includes(entry.value.toLowerCase()),
  );
  const snippetInField = fields.filter((entry) =>
    entry.value.toLowerCase().includes(lower),
  );

  if (containedInSnippet.length > 1 && snippetInField.length === 0) {
    return undefined;
  }

  const candidates =
    snippetInField.length > 0 ? snippetInField : containedInSnippet;
  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const da = Math.abs(a.value.length - cleaned.length);
    const db = Math.abs(b.value.length - cleaned.length);
    return da - db || a.value.length - b.value.length;
  });
  return candidates[0]?.field;
}

/**
 * Builds a pick from already-resolved tag/snippet (testable, no DOM).
 */
export function resolvePreviewPickFromContent(args: {
  sectionType: SectionType;
  content: Record<string, unknown>;
  tag: string;
  snippet: string;
  clickedSectionRoot?: boolean;
}): PreviewPick {
  const snippet = args.snippet.replace(/\s+/g, " ").trim().slice(0, SNIPPET_MAX);
  const field = matchSectionField(
    args.content,
    snippet,
    args.clickedSectionRoot === true,
  );
  return {
    section: args.sectionType,
    field,
    tag: args.tag || "div",
    snippet,
  };
}

/**
 * Prefixes a user prompt so the editor stays on the attached node.
 */
export function formatAttachedEditInstruction(
  pick: PreviewPick,
  userText: string,
): string {
  const fieldPart = pick.field ?? "section";
  const snippet = pick.snippet.replace(/"/g, "'").slice(0, SNIPPET_MAX);
  const textPart = snippet ? ` text="${snippet}"` : "";
  return `[Attached target: ${pick.section}.${fieldPart} tag=${pick.tag}${textPart}]\n${userText}`;
}

/**
 * Composer placeholder when Edit mode is on and an element may be attached.
 */
export function composerPlaceholderForPick(
  pick: PreviewPick | null,
  editMode: boolean,
): string | null {
  if (!editMode) return null;
  if (!pick) return "Click anything in the preview, then describe the change…";
  const target = pick.field ? fieldLabelFor(pick.field) : pick.section;
  return `Change this ${target} — copy, color, background, layout…`;
}

/**
 * True when the composer text is a question, not an edit command.
 */
export function looksLikeQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\?\s*$/.test(trimmed)) return true;
  return /^(what|which|how|why|who|where|can i|could i|should i|do you|tell me|explain|is this|are these)\b/i.test(
    trimmed,
  );
}

/**
 * Walks up to a meaningful tag (button/heading/p) inside the section root.
 */
export function resolvePickTag(
  el: HTMLElement,
  sectionRoot: HTMLElement,
): { tag: string; node: HTMLElement } {
  let node: HTMLElement | null = el;
  while (node && node !== sectionRoot) {
    const tag = node.tagName.toLowerCase();
    if (SEMANTIC_TAGS.has(tag)) return { tag, node };
    node = node.parentElement;
  }
  return { tag: el.tagName.toLowerCase(), node: el };
}

/**
 * Visible text (or img alt) for the pick chip, capped for the editor prefix.
 */
export function snippetFromElement(node: HTMLElement, tag: string): string {
  if (tag === "img") {
    const alt = node.getAttribute("alt") ?? "";
    return alt.replace(/\s+/g, " ").trim().slice(0, SNIPPET_MAX);
  }
  const text = (node.innerText || node.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, SNIPPET_MAX);
}

/**
 * Resolves a preview click to section + optional copy field.
 */
export function previewPickFromEvent(
  event: MouseEvent,
  section: PageSection,
  sectionRoot: HTMLElement,
): PreviewPick {
  const raw = event.target;
  const el = raw instanceof HTMLElement ? raw : sectionRoot;
  const clickedSectionRoot = el === sectionRoot;
  const { tag, node } = clickedSectionRoot
    ? { tag: "section", node: sectionRoot }
    : resolvePickTag(el, sectionRoot);
  return resolvePreviewPickFromContent({
    sectionType: section.type,
    content: section.content,
    tag,
    snippet: snippetFromElement(node, tag),
    clickedSectionRoot,
  });
}

/**
 * Section-only pick used by keyboard activation of a section wrapper.
 */
export function sectionOnlyPick(sectionType: SectionType): PreviewPick {
  return { section: sectionType, tag: "section", snippet: "" };
}
