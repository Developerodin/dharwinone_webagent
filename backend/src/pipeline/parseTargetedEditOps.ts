import { zodResponseFormat } from "openai/helpers/zod";
import { getModelFor, getOpenAIClient } from "../lib/openai.js";
import type { PageFamily } from "../config/pageFamily.js";
import type { Brief } from "../schemas/brief.schema.js";
import {
  editOpsResponseSchema,
  type EditOp,
  type EditOpsResponse,
} from "../schemas/editOps.schema.js";
import type { Page, SectionType } from "../schemas/page.schema.js";
import {
  dropStrayCopyOps,
  userTextFromEditInstruction,
} from "./attachedEditTarget.js";
import { resolveColor } from "./colorResolve.js";
import { TARGETED_EDIT_SKILL } from "./designSkillPrompt.js";
import {
  defaultCopyField,
  extractMaxWords,
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
} from "./resolveEditTarget.js";

const COLOR_PATTERN =
  /#(?:[0-9a-fA-F]{3,8})\b|\b(?:dark|light|forest|off)\s+(?:green|red|blue|gray|grey|orange|purple|pink|brown|yellow|white)\b|\b(?:red|crimson|coral|orange|amber|yellow|gold|green|emerald|teal|cyan|blue|navy|indigo|purple|violet|pink|maroon|brown|cream|beige|white|black|gray|grey|silver|charcoal)\b/gi;

const BUTTON_TAGS = new Set(["button", "a"]);

type TargetedParseArgs = {
  instruction: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
  targetSection: SectionType;
  targetField?: string;
};

/**
 * First named/hex color in the user text that colorResolve accepts.
 */
export function extractColorFromText(text: string): string | null {
  const matches = text.match(COLOR_PATTERN) ?? [];
  for (const raw of matches) {
    const token = raw.replace(/\s+/g, " ").trim();
    if (resolveColor(token)) return token;
  }
  return null;
}

/**
 * Quoted replacement after to/as/=, or a trailing quoted string.
 */
export function extractQuotedReplacement(text: string): string | null {
  const assigned = text.match(
    /(?:to|as|=)\s*[“"']([^”"']+)[”"']/i,
  );
  if (assigned?.[1]?.trim()) return assigned[1].trim();
  const changeTo = text.match(
    /^(?:change|set|update|make)\s+(?:this|it)\s+to\s+(.+)$/i,
  );
  if (changeTo?.[1]) {
    const value = changeTo[1].replace(/^[“"']|[”"']$/g, "").trim();
    if (value && !extractColorFromText(value)) return value;
  }
  return null;
}

/**
 * True when the fixture already resolved a click-scoped edit (skip LLM).
 */
function shouldPreferTargetedFixture(ops: EditOp[]): boolean {
  return ops.some(
    (op) =>
      op.op === "set_section_style" ||
      op.op === "set_text_style" ||
      op.op === "set_copy" ||
      op.op === "cycle_section_component" ||
      op.op === "cycle_image" ||
      op.op === "set_section_spacing" ||
      op.op === "set_image" ||
      op.op === "set_email",
  );
}

/**
 * Reads the attached-target tag from the composer prefix when present.
 */
function attachedTagFromInstruction(instruction: string): string {
  const match = instruction.match(
    /\[Attached target:[^\]]*?\btag=([a-z0-9]+)/i,
  );
  return match?.[1]?.toLowerCase() ?? "";
}

/**
 * Reads the clicked snippet from the composer prefix when present.
 */
function attachedSnippetFromInstruction(instruction: string): string {
  const match = instruction.match(
    /\[Attached target:[^\]]*?\btext="([^"]*)"/i,
  );
  return match?.[1]?.trim() ?? "";
}

/**
 * Builds a set_section_style op with unused fields nulled.
 */
function sectionStyleOp(
  section: SectionType,
  patch: {
    background?: string | null;
    text?: string | null;
    button?: string | null;
    paddingY?: "tight" | "normal" | "roomy" | null;
  },
): EditOp {
  return {
    op: "set_section_style",
    section,
    background: patch.background ?? null,
    text: patch.text ?? null,
    button: patch.button ?? null,
    paddingY: patch.paddingY ?? null,
  };
}

/**
 * Deterministic parser for click-scoped edits (no LLM).
 */
export function parseTargetedEditOpsFixture(args: {
  instruction: string;
  targetSection: SectionType;
  targetField?: string;
}): EditOpsResponse {
  const text = userTextFromEditInstruction(args.instruction);
  const ops: EditOp[] = [];
  const section = args.targetSection;
  const field = args.targetField;
  const tag = attachedTagFromInstruction(args.instruction);
  const snippet = attachedSnippetFromInstruction(args.instruction);
  const color = extractColorFromText(text);
  const quoted = extractQuotedReplacement(text);

  if (quoted && field) {
    ops.push({ op: "set_copy", section, field, value: quoted });
  }

  const wantsBg = /\b(background|bg)\b/i.test(text);
  const wantsDarker = /\b(darker|more dark|make (?:it|this) dark)\b/i.test(text);
  const wantsLighter =
    /\b(lighter|more light|make (?:it|this) light)\b/i.test(text);
  if (wantsBg || ((wantsDarker || wantsLighter) && !field)) {
    const background =
      color ?? (wantsDarker ? "charcoal" : wantsLighter ? "white" : null);
    if (background) {
      ops.push(sectionStyleOp(section, { background }));
    }
  } else if (field && (wantsDarker || wantsLighter) && !color) {
    ops.push({
      op: "set_text_style",
      section,
      field,
      match: snippet || field,
      color: wantsDarker ? "charcoal" : "white",
    });
  }

  const wantsButtonColor =
    Boolean(color) &&
    (BUTTON_TAGS.has(tag) ||
      field === "ctaLabel" ||
      /\b(button|cta)\b/i.test(text)) &&
    !wantsBg;
  if (wantsButtonColor && color) {
    ops.push(sectionStyleOp(section, { button: color }));
  } else if (
    color &&
    field &&
    !wantsBg &&
    /\b(make|color|colour|gold|red|blue|green)\b/i.test(text)
  ) {
    ops.push({
      op: "set_text_style",
      section,
      field,
      match: snippet || field,
      color,
    });
  } else if (color && !field && /\b(text|heading|headline)\b/i.test(text)) {
    ops.push(sectionStyleOp(section, { text: color }));
  }

  if (/\b(tighter|tight|less\s+space)\b/i.test(text)) {
    ops.push({ op: "set_section_spacing", section, paddingY: "tight" });
  } else if (/\b(roomier|roomy|more\s+space|spacious)\b/i.test(text)) {
    ops.push({ op: "set_section_spacing", section, paddingY: "roomy" });
  }

  if (
    isCycleSectionComponentIntent(text) ||
    /\b(different|another|switch|swap)\b.+\b(layout|design|variant|component)\b/i.test(
      text,
    ) ||
    /\b(layout|design)\b.+\b(different|another|switch)\b/i.test(text)
  ) {
    ops.push({ op: "cycle_section_component", section });
  }

  const wantsNewImage =
    (/\b(image|photo|picture)\b/i.test(text) &&
      /\b(change|different|another|next|swap|cycle)\b/i.test(text)) ||
    (tag === "img" &&
      /\b(change|different|another|next|swap|cycle)\b/i.test(text) &&
      !quoted &&
      !wantsBg);
  if (wantsNewImage) {
    ops.push({ op: "cycle_image", section, index: null });
  }

  if (ops.length === 0 && isRewriteCopyIntent(text)) {
    ops.push({
      op: "rewrite_copy",
      section,
      field: field ?? defaultCopyField(section, text),
      maxWords: extractMaxWords(text),
      hint: text,
    });
  }

  const cleaned = dropStrayCopyOps(ops, args.instruction);
  if (cleaned.length === 0) {
    return {
      ops: [],
      summary:
        "Could not parse that attached edit. Try: rewrite this, make this gold, change background to black, switch layout.",
    };
  }

  return {
    ops: cleaned,
    summary: `Update ${section}${field ? `.${field}` : ""} from the attached pick.`,
  };
}

/**
 * Snapshot of the clicked section so the LLM does not scan the whole page.
 */
function sectionSnapshot(page: Page, targetSection: SectionType) {
  const section = page.sections.find((entry) => entry.type === targetSection);
  if (!section) return null;
  return {
    type: section.type,
    componentId: section.componentId,
    content: section.content,
    styleOverrides: section.styleOverrides ?? null,
    assets: section.assets.map((asset) => asset.key),
    layout: section.layout ?? null,
  };
}

/**
 * LLM parser for click-scoped edits: understand the pick, then emit ops.
 */
export async function parseTargetedEditOps(
  args: TargetedParseArgs,
): Promise<EditOpsResponse> {
  const fixture = parseTargetedEditOpsFixture(args);
  if (shouldPreferTargetedFixture(fixture.ops)) {
    return fixture;
  }

  const snapshot = sectionSnapshot(args.page, args.targetSection);
  const userText = userTextFromEditInstruction(args.instruction);
  const field = args.targetField ?? "section";

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.parse({
      model: getModelFor("copy"),
      messages: [
        {
          role: "system",
          content: `${TARGETED_EDIT_SKILL}

Allowed ops (same schema as the unscoped editor):
set_copy, rewrite_copy, set_text_style, set_section_style, set_section_spacing,
cycle_section_component, cycle_image, set_image, remix_section,
set_menu_price, rename_menu_item, remove_menu_item, add_menu_item,
set_gallery_count, set_theme, set_theme_tokens, add_section, remove_section,
reorder_section, remix_layout, set_location, set_email.

Nullable style fields must be null when unused. summary: one sentence of what you understood and applied.`,
        },
        {
          role: "user",
          content: `Theme: ${args.family}
Brief: ${JSON.stringify(args.brief)}
Attached: section=${args.targetSection} field=${field} instructionPrefix=${args.instruction.split("\n")[0] ?? ""}
Current section JSON: ${JSON.stringify(snapshot)}
Other sections on the page (do not edit unless asked): ${args.page.sections
            .map((entry) => entry.type)
            .join(", ")}
User request: ${userText}`,
        },
      ],
      response_format: zodResponseFormat(
        editOpsResponseSchema,
        "targeted_edit_ops",
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (parsed && parsed.ops.length > 0) {
      return {
        ops: dropStrayCopyOps(parsed.ops, args.instruction),
        summary: parsed.summary,
      };
    }
  } catch (error) {
    console.warn(
      "[parseTargetedEditOps] falling back to fixture:",
      error instanceof Error ? error.message : error,
    );
  }

  if (fixture.ops.length > 0) return fixture;

  if (isRewriteCopyIntent(userText)) {
    return {
      ops: [
        {
          op: "rewrite_copy",
          section: args.targetSection,
          field: args.targetField ?? defaultCopyField(args.targetSection, userText),
          maxWords: extractMaxWords(userText),
          hint: userText,
        },
      ],
      summary: `Rewrite ${args.targetSection}.${args.targetField ?? "copy"}.`,
    };
  }

  return fixture;
}
