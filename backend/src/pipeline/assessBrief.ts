import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { getModelFor, getOpenAIClient } from "../lib/openai.js";
import type { Brief } from "../schemas/brief.schema.js";
import {
  applyIntakeRoundCap,
  enrichVagueCategory,
  evaluateBriefReadiness,
  isGenericBusinessName,
  MAX_CLARIFICATION_QUESTIONS,
  selectGapsForRound,
  type BriefGap,
} from "./briefGaps.js";
import { checkScope } from "./checkScope.js";
import { extractBrief } from "./extractBrief.js";
import { hasExplicitNameSignal } from "./hasExplicitNameSignal.js";
import { inferPageFamily } from "./inferPageFamily.js";
import { mergeClarificationAnswers } from "./mergeClarifications.js";
import { detectSkipIntent } from "./skipIntent.js";
import { verifyBriefAgainstSource } from "./verifyBrief.js";
import { isPlaceholderRestaurantEmail } from "../lib/leadValidation.js";
import type { PageFamily } from "../config/pageFamily.js";

const MAX_QUESTIONS = MAX_CLARIFICATION_QUESTIONS;

const LOCATION_QUESTION_RE =
  /\b(street address|where are you located|select location|map pin|nearest landmark)\b/i;

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
  email: "contact email for enquiries and reservations",
  usp: "what makes you different (one line a regular would say)",
  signatureDishes: "2–3 signature dishes you are known for",
  audience: "who usually sits at your tables (date nights, families, office lunch…)",
  story: "how the place started (or founding year)",
  hours: "opening hours",
  neighbourhood: "neighbourhood or landmark",
  menuItems: "menu items with prices",
  phone: "phone number",
  address: "street address",
  brandColors: "brand colors (name or #hex — or skip for theme defaults)",
};

const GAP_QUESTIONS: Partial<Record<BriefGap, string>> = {
  email:
    "What email should receive Contact Us and reservation requests? (This inbox cannot be skipped.)",
  address:
    "Where are you located? Tap Select location on the map, or type the street address / nearest landmark.",
  hours: "What are your opening hours?",
  usp: "In one line — what would a regular say makes you different?",
  signatureDishes: "Which 2–3 dishes are you known for?",
  audience:
    "Who's usually at your tables — date nights, families, office lunches?",
  story: "How did the place start? (or what year did you open?)",
  neighbourhood: "Which neighbourhood or landmark are you near?",
};

const GAP_QUESTION_HINTS: Record<BriefGap, RegExp> = {
  businessName: /business name|restaurant name|called/i,
  category: /cuisine|restaurant (type|style)|what kind/i,
  email: /email|inbox/i,
  address: /located|street address|select location|map pin|nearest landmark/i,
  hours: /hours|open/i,
  usp: /different|unique|regular/i,
  signatureDishes: /dish|known for|signature/i,
  audience: /tables|who(?:'s| is) usually|date night|families/i,
  story: /start|found|open(?:ed)?/i,
  neighbourhood: /neighbourhood|neighborhood|landmark/i,
  menuItems: /menu item|price/i,
  phone: /phone/i,
  brandColors: /brand color|hex/i,
};

/**
 * True when a clarification question is the map-pin / street-address ask.
 */
export function isLocationClarificationQuestion(question: string): boolean {
  return LOCATION_QUESTION_RE.test(question);
}

/**
 * Picks the canned question for a gap when the LLM skipped it.
 */
function fallbackQuestionForGap(gap: BriefGap): string {
  return GAP_QUESTIONS[gap] ?? `What is the ${GAP_LABELS[gap]}?`;
}

/**
 * True when a generated question is clearly about this gap.
 */
function questionCoversGap(question: string, gap: BriefGap): boolean {
  return GAP_QUESTION_HINTS[gap].test(question);
}

/**
 * Builds deterministic fallback questions when the LLM is unavailable.
 */
export function buildFallbackQuestions(gaps: BriefGap[]): string[] {
  return gaps.slice(0, MAX_QUESTIONS).map(fallbackQuestionForGap);
}

/**
 * Keeps location as a solo turn, and fills any asked gap the LLM dropped.
 */
export function sanitizeClarificationQuestions(
  questions: string[],
  askedGaps: BriefGap[],
): string[] {
  const locationOnly = askedGaps.length === 1 && askedGaps[0] === "address";
  if (locationOnly) {
    const loc =
      questions.find(isLocationClarificationQuestion) ??
      GAP_QUESTIONS.address ??
      "Where are you located? Tap Select location on the map, or type the street address.";
    return [loc];
  }

  const unused = questions.filter(
    (question) => !isLocationClarificationQuestion(question),
  );
  const needed = askedGaps.filter((gap) => gap !== "address");
  const filled: string[] = [];
  for (const gap of needed) {
    if (filled.length >= MAX_QUESTIONS) break;
    const matchIndex = unused.findIndex((question) =>
      questionCoversGap(question, gap),
    );
    if (matchIndex >= 0) {
      filled.push(unused.splice(matchIndex, 1)[0]!);
    } else {
      filled.push(fallbackQuestionForGap(gap));
    }
  }
  if (filled.length > 0) return filled;
  return buildFallbackQuestions(askedGaps);
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
      model: getModelFor("questions"),
      messages: [
        {
          role: "system",
          content: `You help clarify an incomplete restaurant website brief.
Generate at most ${MAX_QUESTIONS} short, specific questions.
Ask every Missing item listed this turn. Do not defer a Missing item to a later turn.
NEVER combine street address / map pin with any other question. Location is always its own dedicated turn.
If Missing is only street address, ask exactly one location question and tell them to tap Select location on the map (or type the address).
Contact email is required for Contact Us forms.
For brand colors, mention they can reply with color names or #hex, or skip to use theme defaults.
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
      return sanitizeClarificationQuestions(
        parsed.questions.slice(0, MAX_QUESTIONS),
        gaps,
      );
    }
  } catch (error) {
    console.warn(
      "[assessBrief] question generation fallback:",
      error instanceof Error ? error.message : error,
    );
  }

  return sanitizeClarificationQuestions(buildFallbackQuestions(gaps), gaps);
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

  readiness = applyIntakeRoundCap(readiness, args.clarificationRound, {
    nameOk,
    categoryOk: Boolean(brief.category?.trim()),
    emailOk: !isPlaceholderRestaurantEmail(brief.email ?? ""),
    addressMissing: !brief.address?.trim() && brief.lat == null && brief.lng == null,
  });

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

  const askedGaps = selectGapsForRound(readiness.gaps);
  const questions = await generateClarificationQuestions(
    partialBrief,
    askedGaps,
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
    gaps: askedGaps,
  };
}
