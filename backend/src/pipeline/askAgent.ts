import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { PageFamily } from "../config/pageFamily.js";
import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { Page } from "../schemas/page.schema.js";
import { formatAskClock } from "./askClock.js";
import {
  sanitizeAskHistory,
  type AskHistoryTurn,
} from "./askHistory.js";
import { buildAskSystemPrompt } from "./askSystemPrompt.js";
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
  /** When true, UI opens the map picker instead of running Editor. */
  openLocationPicker: boolean;
  /** Chip labels the user can send as the next chat turn. */
  suggestions: string[];
};

/** Fallback copy used only when the LLM is unavailable for builder questions. */
export const CANNED_BUILDER_HELP = [
  "I can help with colors, fonts, section spacing, add/remove sections, copy, images, and themes.",
  "",
  "Ask anything — or tell me a change like “make Bite! red” / “switch header layout” / “surprise me”.",
].join("\n");

const askResponseSchema = z.object({
  intent: z.enum(["ask", "edit"]),
  message: z.string().min(1),
  proposedEdit: z.string().nullable(),
  specialist: z.enum(["style", "layout", "copy", "general"]).nullable(),
  openLocationPicker: z.boolean(),
  suggestions: z.array(z.string()).max(6),
});

/**
 * Caps and cleans chip labels from the model or heuristic.
 */
function sanitizeSuggestions(raw: string[] | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const label = item.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * Fills Ask result defaults so every branch sets openLocationPicker + suggestions.
 */
function askResult(
  result: Omit<AskAgentResult, "openLocationPicker" | "suggestions"> & {
    openLocationPicker?: boolean;
    suggestions?: string[];
  },
): AskAgentResult {
  return {
    openLocationPicker: false,
    ...result,
    suggestions: sanitizeSuggestions(result.suggestions),
  };
}

/**
 * True when the user is talking about a contact inbox, not a street address.
 */
export function isEmailInboxIntent(instruction: string): boolean {
  const text = instruction.trim();
  if (!text) return false;
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return true;
  if (!/\bemail(\s+address)?\b/i.test(text)) return false;
  if (/\b(map|pin|google\s*maps?)\b/i.test(text)) return false;
  return /\b(add|update|change|set|edit|need|want)\b/i.test(text);
}

/**
 * True when the user wants a map/street pin (never for email inbox).
 */
export function wantsLocationPicker(instruction: string): boolean {
  const text = instruction.trim();
  if (!text || isEmailInboxIntent(text)) return false;
  const lower = text.toLowerCase();
  if (/\b(google\s*maps?|map\s+embed|drop\s+a\s+pin)\b/.test(lower)) return true;
  if (/\bpick\s+(?:a\s+|the\s+|our\s+)?(?:location|address|pin)\b/.test(lower)) {
    return true;
  }
  const hasPlace =
    /\b(location|street\s+address|map|pin)\b/.test(lower) ||
    (/\baddress\b/.test(lower) && !/\bemail\b/.test(lower));
  const hasAction =
    /\b(add|update|change|set|edit|pick|choose|select|put|move|need|want|wanna|please)\b/.test(
      lower,
    );
  return hasPlace && hasAction;
}

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
  if (isEmailInboxIntent(text)) return true;

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
 * True for greetings, math, trivia — must hit the LLM, not canned builder help.
 */
export function isGeneralConversationHeuristic(instruction: string): boolean {
  const text = instruction.trim();
  if (!text) return false;
  if (/^(hi|hey|hello|yo|sup|howdy)([!.\s]|$)/i.test(text)) return true;
  if (/\d+\s*[+\-*/x×÷]\s*\d+/.test(text)) return true;
  if (/^(who|when|where|why)\b/i.test(text)) return true;
  if (
    /^what\s+(is|are|was|were|'s)\b/i.test(text) &&
    !/\b(theme|themes|color|colors|font|fonts|section|sections|layout)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/^(what'?s|whats)\s+the\s+time\b/i.test(text)) return true;
  if (/^what\s+(time|day|date)\b/i.test(text)) return true;
  return false;
}

/**
 * True when Ask should skip the LLM (clear edit, map pin, theme list, fixture).
 */
export function shouldShortCircuitAsk(
  instruction: string,
  useFixture = false,
): boolean {
  if (useFixture) return true;
  if (isThemeInquiryIntent(instruction)) return true;
  if (wantsLocationPicker(instruction)) return true;
  if (isClearEditHeuristic(instruction)) return true;
  if (isGeneralConversationHeuristic(instruction)) return false;
  return classifyIntentHeuristic(instruction).intent === "edit";
}

/**
 * Heuristic intent classification when LLM is unavailable or skipped.
 */
export function classifyIntentHeuristic(instruction: string): AskAgentResult {
  const text = instruction.trim();
  const lower = text.toLowerCase();

  if (isEmailInboxIntent(text)) {
    return askResult({
      intent: "edit",
      message: "",
      proposedEdit: null,
      specialist: "copy",
    });
  }

  if (wantsLocationPicker(text)) {
    return askResult({
      intent: "ask",
      message: "Pick the place on the map, or tap Select location if you closed the picker.",
      proposedEdit: null,
      specialist: "general",
      openLocationPicker: true,
    });
  }

  if (isThemeInquiryIntent(text)) {
    return askResult({
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
    });
  }

  if (/\b(surprise\s+me|remix(\s+layout)?|different\s+layouts?)\b/i.test(text)) {
    return askResult({
      intent: "edit",
      message: "",
      proposedEdit: null,
      specialist: "layout",
    });
  }

  if (isCycleSectionComponentIntent(text)) {
    const section = inferEditSection(text, "header");
    return askResult({
      intent: "edit",
      message: "",
      proposedEdit: `switch ${section} layout`,
      specialist: "layout",
    });
  }

  if (isGeneralConversationHeuristic(text)) {
    return askResult({
      intent: "ask",
      message:
        "I can answer that — or tell me what you want to change on the site.",
      proposedEdit: null,
      specialist: "general",
    });
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
    return askResult({
      intent: "edit",
      message: "",
      proposedEdit: null,
      specialist,
    });
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

    return askResult({
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
        : CANNED_BUILDER_HELP,
      proposedEdit: proposal,
      specialist,
    });
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
    return askResult({
      intent: "edit",
      message: "",
      proposedEdit: null,
      specialist,
    });
  }

  return askResult({
    intent: "ask",
    message:
      "I can answer questions or propose edits (colors, fonts, sections, spacing). What would you like to do?",
    proposedEdit: null,
    specialist: "general",
  });
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
  history?: AskHistoryTurn[];
}): Promise<AskAgentResult> {
  const useFixture =
    Boolean(args.useFixture) || process.env.USE_FIXTURE_BRIEF === "true";
  const heuristic = classifyIntentHeuristic(args.instruction);
  if (shouldShortCircuitAsk(args.instruction, useFixture)) {
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

  const history = sanitizeAskHistory(args.history);
  const clock = formatAskClock();

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.parse({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content: buildAskSystemPrompt(clock),
        },
        ...history.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
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
      return askResult({
        intent: parsed.intent,
        message: parsed.message,
        proposedEdit: parsed.proposedEdit,
        specialist: parsed.specialist,
        openLocationPicker: parsed.openLocationPicker,
        suggestions: parsed.suggestions,
      });
    }
  } catch (error) {
    console.warn(
      "[askAgent] falling back to heuristic:",
      error instanceof Error ? error.message : error,
    );
  }

  return heuristic;
}
