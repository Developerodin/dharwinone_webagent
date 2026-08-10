import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import {
  enrichVagueCategory,
  evaluateBriefReadiness,
  isGenericBusinessName,
  splitGaps,
  type BriefGap,
} from "./briefGaps.js";
import { checkScope } from "./checkScope.js";
import { extractBrief } from "./extractBrief.js";
import { hasExplicitNameSignal } from "./hasExplicitNameSignal.js";
import { inferPageFamily } from "./inferPageFamily.js";
import { mergeClarificationAnswers } from "./mergeClarifications.js";
import { detectSkipIntent } from "./skipIntent.js";
import { verifyBriefAgainstSource } from "./verifyBrief.js";
import type { PageFamily } from "../config/pageFamily.js";

const MAX_QUESTIONS = 3;
/** After this many clarification rounds, stop re-asking optional gaps. */
const MAX_CLARIFICATION_ROUNDS = 2;

const questionsSchema = z.object({
  questions: z.array(z.string().min(1)).max(MAX_QUESTIONS),
});

export type AssessBriefInput = {
  chatText: string;
  answers?: Record<string, string>;
  clarificationRound?: number;
  useFixture?: boolean;
};

export type AssessBriefResult =
  | {
      status: "needs_clarification";
      questions: string[];
      partialBrief: Brief;
      clarificationRound: number;
      enrichedChatText: string;
      pageFamily: PageFamily;
      canSkip: boolean;
      gaps: BriefGap[];
    }
  | {
      status: "ready";
      brief: Brief;
      clarificationRound: number;
      enrichedChatText: string;
      pageFamily: PageFamily;
    }
  | {
      status: "unsupported";
      message: string;
      clarificationRound: number;
      enrichedChatText: string;
    };

const GAP_LABELS: Record<BriefGap, string> = {
  businessName: "business name",
  category: "restaurant type or cuisine",
  menuItems: "menu items with prices",
  phone: "phone number",
  address: "street address",
};

/**
 * Builds deterministic fallback questions when the LLM is unavailable.
 */
export function buildFallbackQuestions(gaps: BriefGap[]): string[] {
  return gaps.slice(0, MAX_QUESTIONS).map(
    (gap) => `What is the ${GAP_LABELS[gap]}?`,
  );
}

/**
 * Generates 1–3 targeted clarification questions for missing brief fields.
 */
export async function generateClarificationQuestions(
  partialBrief: Brief,
  gaps: BriefGap[],
  chatText: string,
): Promise<string[]> {
  if (gaps.length === 0) {
    return [];
  }

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.parse({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content: `You help clarify an incomplete restaurant website brief.
Generate at most ${MAX_QUESTIONS} short, specific questions.
Ask only about missing items. Do not ask what is already known.
If asking for phone, address, or menu, keep questions friendly and specific.
Return plain questions only — no numbering prefix.`,
        },
        {
          role: "user",
          content: `Original message:\n${chatText}\n\nExtracted so far:\n${JSON.stringify(partialBrief, null, 2)}\n\nMissing: ${gaps.map((g) => GAP_LABELS[g]).join(", ")}`,
        },
      ],
      response_format: zodResponseFormat(questionsSchema, "clarification_questions"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (parsed?.questions?.length) {
      return parsed.questions.slice(0, MAX_QUESTIONS);
    }
  } catch (error) {
    console.warn(
      "[assessBrief] question generation fallback:",
      error instanceof Error ? error.message : error,
    );
  }

  return buildFallbackQuestions(gaps);
}

/**
 * True when extracted business name is usable (not missing/generic).
 */
function hasUsableBusinessName(brief: Brief): boolean {
  return Boolean(
    brief.businessName?.trim() && !isGenericBusinessName(brief.businessName),
  );
}

/**
 * Applies cuisine rescue + name-signal override + round caps to readiness.
 */
function refineReadiness(args: {
  brief: Brief;
  chatText: string;
  clarificationRound: number;
  skipConfirmed: boolean;
}): { brief: Brief; readiness: ReturnType<typeof evaluateBriefReadiness> } {
  const brief: Brief = {
    ...args.brief,
    category: enrichVagueCategory(args.brief.category, args.chatText),
  };

  let readiness = evaluateBriefReadiness(brief, {
    skipConfirmed: args.skipConfirmed,
  });

  const nameOk = hasUsableBusinessName(brief);
  const nameSignal = hasExplicitNameSignal(args.chatText);

  // Only force a name ask when we still lack a usable extracted name.
  if (!nameOk && !nameSignal) {
    if (readiness.status === "ready") {
      readiness = {
        status: "needs_clarification",
        gaps: ["businessName"],
        canSkip: false,
      };
    } else if (!readiness.gaps.includes("businessName")) {
      readiness = {
        ...readiness,
        gaps: ["businessName", ...readiness.gaps],
        canSkip: false,
      };
    }
  }

  // Hard stop: after enough rounds, auto-skip optional gaps.
  if (
    readiness.status === "needs_clarification" &&
    args.clarificationRound >= MAX_CLARIFICATION_ROUNDS
  ) {
    const { critical, optional } = splitGaps(readiness.gaps);
    if (critical.length === 0 && optional.length > 0) {
      return { brief, readiness: { status: "ready" } };
    }
    // Critical still missing after max rounds — ask one combined required Q once more,
    // but if we already asked beyond max+1, proceed best-effort with what we have.
    if (critical.length > 0 && args.clarificationRound >= MAX_CLARIFICATION_ROUNDS + 1) {
      if (nameOk && brief.category?.trim()) {
        return { brief, readiness: { status: "ready" } };
      }
      readiness = {
        status: "needs_clarification",
        gaps: critical,
        canSkip: false,
      };
    }
  }

  return { brief, readiness };
}

/**
 * Assesses chat intake: extract brief, detect gaps, return questions or ready status.
 */
export async function assessBrief(
  input: AssessBriefInput,
): Promise<AssessBriefResult> {
  const clarificationRound = input.clarificationRound ?? 0;
  const useFixture =
    input.useFixture ?? process.env.USE_FIXTURE_BRIEF === "true";

  const earlyScope = checkScope({ chatText: input.chatText });
  if (!earlyScope.ok) {
    return {
      status: "unsupported",
      message: earlyScope.message,
      clarificationRound,
      enrichedChatText: input.chatText,
    };
  }

  if (useFixture) {
    return {
      status: "ready",
      brief: FIXTURE_BRIEF,
      clarificationRound,
      enrichedChatText: input.chatText,
      pageFamily: inferPageFamily(FIXTURE_BRIEF, input.chatText),
    };
  }

  const enrichedChatText = input.answers
    ? mergeClarificationAnswers(input.chatText, input.answers)
    : input.chatText;

  const rawBrief = await extractBrief(enrichedChatText);
  const verifiedBrief = verifyBriefAgainstSource(rawBrief, enrichedChatText);

  const categoryScope = checkScope({
    chatText: enrichedChatText,
    category: verifiedBrief.category,
  });
  if (!categoryScope.ok) {
    return {
      status: "unsupported",
      message: categoryScope.message,
      clarificationRound,
      enrichedChatText,
    };
  }

  const skipConfirmed = detectSkipIntent(enrichedChatText);
  const { brief: partialBrief, readiness } = refineReadiness({
    brief: verifiedBrief,
    chatText: enrichedChatText,
    clarificationRound,
    skipConfirmed,
  });

  if (readiness.status === "ready") {
    return {
      status: "ready",
      brief: partialBrief,
      clarificationRound,
      enrichedChatText,
      pageFamily: inferPageFamily(partialBrief, enrichedChatText),
    };
  }

  const questions = await generateClarificationQuestions(
    partialBrief,
    readiness.gaps,
    enrichedChatText,
  );

  return {
    status: "needs_clarification",
    questions,
    partialBrief,
    clarificationRound: clarificationRound + 1,
    enrichedChatText,
    pageFamily: inferPageFamily(partialBrief, enrichedChatText),
    canSkip: readiness.canSkip,
    gaps: readiness.gaps,
  };
}
