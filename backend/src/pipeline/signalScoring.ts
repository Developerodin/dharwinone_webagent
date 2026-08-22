import type { Brief } from "../schemas/brief.schema.js";

/**
 * One weighted piece of evidence for a classification outcome.
 *
 * Structured brief fields should carry more weight than loose keywords: a brief
 * that says `priceBand: "fine_dining"` is far stronger evidence than the word
 * "counter" appearing once in a sentence.
 */
export type SignalRule<T extends string> = {
  outcome: T;
  weight: number;
  /** Matched against the text corpus (category, usp, audience, chat). */
  pattern?: RegExp;
  /** Structured predicate over the brief. */
  test?: (brief: Brief) => boolean;
  /** Weight removed from other outcomes when this rule fires. */
  suppresses?: Partial<Record<T, number>>;
  /** Short label for the decision trace. */
  note?: string;
};

export type ClassifyResult<T extends string> = {
  outcome: T;
  scores: Record<string, number>;
  /** Rules that fired, strongest first — the explanation for the outcome. */
  matched: Array<{ outcome: T; weight: number; note: string }>;
};

/**
 * Scores every outcome against the rule set and returns the strongest.
 *
 * Deliberately additive rather than first-match-wins: a business is described
 * by the balance of its signals, not by whichever keyword the author happened
 * to list first. A single weak keyword can no longer override the whole brief.
 */
export function classifyBySignals<T extends string>(args: {
  rules: ReadonlyArray<SignalRule<T>>;
  outcomes: readonly T[];
  brief: Brief;
  corpus: string;
  fallback: T;
  /** Minimum score before the fallback is preferred. */
  minimumScore?: number;
}): ClassifyResult<T> {
  const text = args.corpus.toLowerCase();
  const scores = Object.fromEntries(
    args.outcomes.map((outcome) => [outcome, 0]),
  ) as Record<T, number>;
  const matched: ClassifyResult<T>["matched"] = [];

  for (const rule of args.rules) {
    const fires =
      (rule.pattern ? rule.pattern.test(text) : false) ||
      (rule.test ? rule.test(args.brief) : false);
    if (!fires) continue;

    scores[rule.outcome] += rule.weight;
    matched.push({
      outcome: rule.outcome,
      weight: rule.weight,
      note: rule.note ?? rule.pattern?.source ?? "structured",
    });

    for (const [target, penalty] of Object.entries(rule.suppresses ?? {})) {
      const key = target as T;
      if (key in scores) scores[key] -= penalty as number;
    }
  }

  let best = args.fallback;
  let bestScore = Number.NEGATIVE_INFINITY;
  // Stable order: outcomes are declared in priority order for exact ties.
  for (const outcome of args.outcomes) {
    if (scores[outcome] > bestScore) {
      best = outcome;
      bestScore = scores[outcome];
    }
  }

  if (bestScore < (args.minimumScore ?? 1)) best = args.fallback;

  matched.sort((a, b) => b.weight - a.weight);
  return { outcome: best, scores, matched };
}
