import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { PageFamily } from "../config/pageFamily.js";
import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { Page } from "../schemas/page.schema.js";
import { listNamedColors } from "./colorResolve.js";
import {
  inferEditSection,
  isCycleSectionComponentIntent,
} from "./resolveEditTarget.js";
import { isThemeInquiryIntent } from "./themeInquiry.js";

export type AskIntent = "ask" | "edit";

export type AskAgentResult = {
  intent: AskIntent;
  /** Assistant/Ask reply shown to the user. */
  message: string;
  /** When set, UI shows “Apply with Editor” for this instruction. */
  proposedEdit: string | null;
  /** Specialist hint for edit UX cards. */
  specialist: "style" | "layout" | "copy" | "general" | null;
};

const askResponseSchema = z.object({
  intent: z.enum(["ask", "edit"]),
  message: z.string().min(1),
  proposedEdit: z.string().nullable(),
  specialist: z.enum(["style", "layout", "copy", "general"]).nullable(),
});

/**
 * True when heuristic already knows this is a clear edit (skip LLM).
 */
export function isClearEditHeuristic(instruction: string): boolean {
  const text = instruction.trim();
  if (!text) return false;

  if (/\b(surprise\s+me|remix(\s+layout)?|different\s+layouts?)\b/i.test(text)) {
    return true;
  }
  if (isCycleSectionComponentIntent(text)) return true;

  // Single accent / color / text style / theme family / font
  if (
    /\b(make|color|colour)\s+.+\b(#?[0-9a-fA-F]{3,6}|red|green|blue|orange|pink|purple|gold|coral|teal|navy|black|white|dark\s+green|light\s+grey)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  if (
    /\b(accent|brand|button|cta|background|bg)\b.+\b(#?[0-9a-fA-F]{3,6}|[a-z]+(?:\s+[a-z]+)?)\b/i.test(
      text,
    ) &&
    !/\?$/.test(text)
  ) {
    return true;
  }
  if (
    /\b(use|switch|change)\s+(premium|elegant|minimal|rustic|vibrant|bold)\s+theme\b/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/\b(black\s+and\s+white|monochrome|b\s*&\s*w)\b/i.test(text)) {
    return true;
  }

  return false;
}

/**
 * Heuristic intent classification when LLM is unavailable or skipped.
 */
export function classifyIntentHeuristic(instruction: string): AskAgentResult {
  const text = instruction.trim();
  const lower = text.toLowerCase();

  if (isThemeInquiryIntent(text)) {
    return {
      intent: "ask",
      message: [
        "Themes available:",
        "• Premium — warm refined",
        "• Elegant — dark/gold upscale",
        "• Minimal — clean modern",
        "• Rustic — earthy farmhouse",
        "• Vibrant — bold colorful",
        "",
        "Say e.g. “use minimal theme” to switch — or ask me to propose colors/fonts first.",
      ].join("\n"),
      proposedEdit: null,
      specialist: "style",
    };
  }

  if (/\b(surprise\s+me|remix(\s+layout)?|different\s+layouts?)\b/i.test(text)) {
    return {
      intent: "edit",
      message: "",
      proposedEdit: null,
      specialist: "layout",
    };
  }

  if (isCycleSectionComponentIntent(text)) {
    const section = inferEditSection(text, "header");
    return {
      intent: "edit",
      message: "",
      proposedEdit: `switch ${section} layout`,
      specialist: "layout",
    };
  }

  const isQuestion =
    /\?$/.test(text) ||
    /^(what|which|how|can i|could i|should i|do you|tell me|explain|show me|list)\b/i.test(
      text,
    ) ||
    /\bwhat (themes|colors|fonts|sections)\b/i.test(lower);

  const needsConfirm =
    /\b(add|remove)\s+(a\s+|an\s+|the\s+)?(section|gallery|testimonials|team|services|menu|about|hero)\b/i.test(
      text,
    ) ||
    /\b(spacing|tighter|roomier|more space|less space)\b/i.test(lower) ||
    (/\band\b/.test(lower) &&
      /\b(colou?r|font|button|background|section)\b/i.test(lower) &&
      (text.match(/\b(colou?r|font|button|background)\b/gi) ?? []).length >= 2);

  if (isClearEditHeuristic(text) && !isQuestion) {
    const specialist = /\b(add|remove)\s+.*section|spacing|tighter|roomy|layout|header|surprise|remix/i.test(
      lower,
    )
      ? "layout"
      : /\b(colou?r|font|accent|button|background|theme|black\s+and\s+white)\b/i.test(
            lower,
          )
        ? "style"
        : "copy";
    return {
      intent: "edit",
      message: "",
      proposedEdit: null,
      specialist,
    };
  }

  if (isQuestion || needsConfirm) {
    const specialist = /\b(section|spacing|add|remove|header|layout)\b/i.test(
      lower,
    )
      ? "layout"
      : /\b(colou?r|font|accent|button|background|theme)\b/i.test(lower)
        ? "style"
        : "general";

    const proposal = needsConfirm
      ? text
      : isCycleSectionComponentIntent(text)
        ? `switch ${inferEditSection(text, "header")} layout`
        : null;

    return {
      intent: "ask",
      message: proposal
        ? [
            "Here’s what I can do:",
            "",
            `• ${proposal}`,
            "",
            "Want me to apply this with the **Editor**?",
            specialist === "style"
              ? `\nTip: colors can be names (${listNamedColors().slice(0, 8).join(", ")}…) or #hex.`
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            "I can help with colors, fonts, section spacing, add/remove sections, copy, images, and themes.",
            "",
            "Ask anything — or tell me a change like “make Bite! red” / “switch header layout” / “surprise me”.",
          ].join("\n"),
      proposedEdit: proposal,
      specialist,
    };
  }

  const clearEdit =
    /\b(change|set|update|rewrite|make|color|colour|use|switch)\b/i.test(
      text,
    ) &&
    !isQuestion &&
    !needsConfirm;

  if (clearEdit) {
    const specialist = /\b(add|remove)\s+.*section|spacing|tighter|roomy|header|layout/i.test(
      lower,
    )
      ? "layout"
      : /\b(colou?r|font|accent|button|background|theme|make .+ (red|green|blue))\b/i.test(
            lower,
          )
        ? "style"
        : "copy";
    return {
      intent: "edit",
      message: "",
      proposedEdit: null,
      specialist,
    };
  }

  return {
    intent: "ask",
    message:
      "I can answer questions or propose edits (colors, fonts, sections, spacing). What would you like to do?",
    proposedEdit: null,
    specialist: "general",
  };
}

/**
 * Ask agent: answer questions / propose edits; never mutates the page.
 * Clear intents use heuristics first so the LLM cannot “clarify” them away.
 */
export async function runAskAgent(args: {
  instruction: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
  useFixture?: boolean;
}): Promise<AskAgentResult> {
  const heuristic = classifyIntentHeuristic(args.instruction);
  if (
    args.useFixture ||
    process.env.USE_FIXTURE_BRIEF === "true" ||
    isClearEditHeuristic(args.instruction) ||
    heuristic.intent === "edit"
  ) {
    // For cycle intents, pass proposedEdit so confirm CTAs have a clean string
    if (
      heuristic.intent === "edit" &&
      heuristic.proposedEdit &&
      isCycleSectionComponentIntent(args.instruction)
    ) {
      return {
        ...heuristic,
        // Apply immediately — no confirm needed for clear cycle
        proposedEdit: null,
      };
    }
    return heuristic;
  }

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.parse({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content: `You are the Ask agent for a restaurant website builder.
You NEVER mutate the page. You answer questions, suggest options, and optionally propose an edit instruction for the Editor.

Return intent:
- "edit" for clear imperatives: rewrite one headline, color a word, set accent/bg, named theme switch, "surprise me"/"remix layout", "switch header layout" / cycle one section.
- "ask" for questions, vague asks, add/remove section, multi-target palettes needing confirmation.

CRITICAL:
- "surprise me" / "remix layout" → intent edit (never ask clarifying questions).
- Header/nav/footer “different component / not looking good / switch it” → intent edit; proposedEdit like "switch header layout". NEVER remix_layout for a single section.
- remix_layout only when user says surprise/remix/different layouts (global).

When intent is ask and a concrete change is requested, set proposedEdit to the exact Editor instruction and ask to confirm.
When intent is edit, message may be empty and proposedEdit null (Editor runs the user text), unless you normalize to a clearer instruction in proposedEdit.
specialist: style | layout | copy | general.

Supported: brand/section/button/text colors (names, dark green, light grey, or #hex), fonts, partial word color, add/remove sections (not header/footer remove), spacing, themes, copy, images, menu, cycle section layouts including header/contact/footer.
Unsupported: videos, map embeds, multi-page, drag-resize, custom font uploads.`,
        },
        {
          role: "user",
          content: `Theme: ${args.family}
Brief: ${JSON.stringify(args.brief)}
Sections: ${JSON.stringify(
            args.page.sections.map((s) => ({
              type: s.type,
              componentId: s.componentId,
              styleOverrides: s.styleOverrides ?? null,
            })),
          )}
Theme overrides: ${JSON.stringify(args.page.themeOverrides ?? null)}
User: ${args.instruction}`,
        },
      ],
      response_format: zodResponseFormat(askResponseSchema, "ask_agent"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (parsed) {
      return {
        intent: parsed.intent,
        message: parsed.message,
        proposedEdit: parsed.proposedEdit,
        specialist: parsed.specialist,
      };
    }
  } catch (error) {
    console.warn(
      "[askAgent] falling back to heuristic:",
      error instanceof Error ? error.message : error,
    );
  }

  return heuristic;
}
