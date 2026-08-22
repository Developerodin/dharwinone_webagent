import type { ComponentSpec, LayoutFamily } from "../schemas/componentSpec.schema.js";
import type { SectionPlanItem } from "../schemas/creativeDirection.schema.js";
import { stableHash } from "../lib/stableHash.js";
import type { DiversityPressure } from "./diversityLedger.js";

/**
 * Which composition a planned layout intent is asking for. The plan speaks in
 * intents ("split_left"); components describe themselves in layout families
 * ("split"). This is the translation between the two vocabularies.
 */
const INTENT_TO_FAMILY: Record<SectionPlanItem["layoutIntent"], LayoutFamily[]> = {
  full_bleed: ["immersive"],
  split_left: ["split"],
  split_right: ["split"],
  centered: ["band", "editorial"],
  editorial_columns: ["editorial"],
  grid: ["grid"],
  band: ["band"],
  overlap: ["feature"],
  marquee: ["feature", "grid"],
};

/** Visual weight each emphasis level is asking for. */
const EMPHASIS_WEIGHT: Record<SectionPlanItem["emphasis"], number> = {
  hero: 5,
  major: 4,
  standard: 3,
  compact: 2,
};

/** Component density each page density is asking for. */
const DENSITY_TARGET: Record<string, number> = {
  spacious: 2,
  normal: 3,
  compact: 4,
};

export type ScoreTerm = { name: string; delta: number; why: string };

export type RankedCandidate = {
  spec: ComponentSpec;
  total: number;
  terms: ScoreTerm[];
};

/**
 * Diversity weights are deliberately the smallest in the model.
 *
 * The priority the engine must respect is: hard capability, then content
 * correctness, then Design DNA, then composition, then adjacency, and only
 * then diversity. A well-matched component that repeats must still beat a
 * poorly-matched one that happens to be novel — so the whole diversity band is
 * capped below a single layout mismatch (-2) plus a style match (+3).
 */
const DIVERSITY_MAX_PENALTY = 3;
const DIVERSITY_MAX_BONUS = 2;
/**
 * Evidence scaling. One prior build is a weak signal, so it earns a fraction of
 * the weight; by three builds the pattern is real and the full (still small)
 * weight applies. This is what lets Website B diverge from Website A without a
 * single observation swinging a decision.
 */
const FULL_CONFIDENCE_SAMPLE = 3;

export type RankContext = {
  plan: SectionPlanItem;
  /** Style tokens from the Design DNA (vibe, category, archetype). */
  dnaStyles: readonly string[];
  dnaDensity: string;
  /** The component chosen for the section immediately above this one. */
  previous?: ComponentSpec | null;
  /** Layout families already used on this page. */
  usedLayoutFamilies?: readonly LayoutFamily[];
  /** Images actually available for this section. */
  availableMedia?: number;
  /** Stable seed so ties break the same way on every rebuild. */
  seed: string;
  /** Cross-build history for comparable sites. Absent = no diversity pressure. */
  pressure?: DiversityPressure | null;
};

/**
 * Scores one candidate. Every term is named and carries its own reason, so the
 * selection can be explained rather than just asserted.
 */
export function scoreCandidate(
  spec: ComponentSpec,
  context: RankContext,
): RankedCandidate {
  const terms: ScoreTerm[] = [];

  // --- does the component compose the way the plan asked for?
  const wanted = INTENT_TO_FAMILY[context.plan.layoutIntent] ?? [];
  if (wanted.includes(spec.layoutFamily)) {
    terms.push({
      name: "layoutMatch",
      delta: 8,
      why: `${spec.layoutFamily} matches intent ${context.plan.layoutIntent}`,
    });
  } else if (wanted.length > 0) {
    terms.push({
      name: "layoutMatch",
      delta: -2,
      why: `${spec.layoutFamily} is not ${wanted.join("/")}`,
    });
  }

  // --- does it feel the way the brand feels?
  const matchedStyles = spec.styles.filter((style) =>
    context.dnaStyles.includes(style),
  );
  if (matchedStyles.length > 0) {
    terms.push({
      name: "styleMatch",
      delta: Math.min(6, matchedStyles.length * 3),
      why: `shares ${matchedStyles.join(", ")}`,
    });
  }

  // --- is it as loud as this position in the page needs?
  const wantedWeight = EMPHASIS_WEIGHT[context.plan.emphasis];
  const weightGap = Math.abs(spec.visualWeight - wantedWeight);
  terms.push({
    name: "emphasisFit",
    delta: 4 - weightGap * 2,
    why: `weight ${spec.visualWeight} vs ${context.plan.emphasis} (${wantedWeight})`,
  });

  // --- is it as busy as the page's density wants?
  const wantedDensity = DENSITY_TARGET[context.dnaDensity] ?? 3;
  const densityGap = Math.abs(spec.density - wantedDensity);
  terms.push({
    name: "densityFit",
    delta: 3 - densityGap * 1.5,
    why: `density ${spec.density} vs ${context.dnaDensity} (${wantedDensity})`,
  });

  // --- does it sit well after the section above it?
  const previous = context.previous;
  if (previous) {
    if (spec.adjacency?.avoidAfter?.includes(previous.layoutFamily)) {
      terms.push({
        name: "adjacencyConflict",
        delta: -10,
        why: `avoids following ${previous.layoutFamily}`,
      });
    }
    if (spec.adjacency?.goodAfter?.includes(previous.layoutFamily)) {
      terms.push({
        name: "adjacencyBonus",
        delta: 4,
        why: `designed to follow ${previous.layoutFamily}`,
      });
    }
    if (previous.layoutFamily === spec.layoutFamily) {
      terms.push({
        name: "repetitionPenalty",
        delta: -6,
        why: `${spec.layoutFamily} twice in a row`,
      });
    }
    if (previous.density >= 4 && spec.density >= 4) {
      terms.push({
        name: "densityStackPenalty",
        delta: -5,
        why: "dense band immediately after a dense band",
      });
    }
  }

  // --- would it waste or stretch the imagery we have?
  if (typeof context.availableMedia === "number" && spec.media.max > 0) {
    if (context.availableMedia >= spec.media.max) {
      terms.push({ name: "mediaFit", delta: 2, why: "has every image it wants" });
    } else if (context.availableMedia < spec.media.min) {
      terms.push({
        name: "mediaShortfall",
        delta: -12,
        why: `needs ${spec.media.min}, has ${context.availableMedia}`,
      });
    }
  }

  // --- gentle push away from a family already used elsewhere on the page
  if (context.usedLayoutFamilies?.includes(spec.layoutFamily)) {
    terms.push({
      name: "pageVarietyPenalty",
      delta: -2,
      why: `${spec.layoutFamily} already used on this page`,
    });
  }

  // --- cross-build memory: has this choice already been used a lot for
  //     comparable businesses? Soft by construction (see the weight cap).
  const pressure = context.pressure;
  if (pressure && pressure.sampleSize > 0) {
    const confidence = Math.min(1, pressure.sampleSize / FULL_CONFIDENCE_SAMPLE);
    const componentRate = pressure.componentRate(spec.id);
    const layoutRate = pressure.layoutRate(context.plan.type, spec.layoutFamily);
    // Blended rather than max: if the whole cohort used a "grid" gallery, every
    // grid candidate shares that pressure, and taking the max would hide which
    // specific component is the over-used one.
    const saturation = componentRate * 0.6 + layoutRate * 0.4;
    const builds = `${pressure.sampleSize} comparable build${pressure.sampleSize === 1 ? "" : "s"}`;

    if (saturation > 0) {
      const penalty = -Number(
        (saturation * DIVERSITY_MAX_PENALTY * confidence).toFixed(2),
      );
      terms.push({
        name: "diversityPenalty",
        delta: penalty,
        why:
          componentRate >= layoutRate
            ? `used in ${Math.round(componentRate * 100)}% of the last ${builds}`
            : `${spec.layoutFamily} filled ${context.plan.type} in ${Math.round(layoutRate * 100)}% of the last ${builds}`,
      });
    } else {
      terms.push({
        name: "diversityBonus",
        delta: Number((DIVERSITY_MAX_BONUS * confidence).toFixed(2)),
        why: `unused across the last ${builds}`,
      });
    }
  }

  // --- stable spread so two similar businesses do not collapse onto one pick.
  //     Kept below the diversity band: this is an arbitrary tie-break, and it
  //     must not outweigh a real observation about what has already shipped.
  const spread = (stableHash(`${context.seed}:${spec.id}`) % 5) / 4;
  terms.push({ name: "seedSpread", delta: spread, why: "stable tie-break" });

  const total = terms.reduce((sum, term) => sum + term.delta, 0);
  return { spec, total, terms };
}

export type RankResult = {
  chosen: ComponentSpec | null;
  ranked: RankedCandidate[];
};

/**
 * Ranks every candidate and returns the winner plus the full ordered table.
 */
export function rankCandidates(
  candidates: readonly ComponentSpec[],
  context: RankContext,
): RankResult {
  if (candidates.length === 0) return { chosen: null, ranked: [] };

  const ranked = candidates
    .map((spec) => scoreCandidate(spec, context))
    .sort((a, b) => b.total - a.total || a.spec.id.localeCompare(b.spec.id));

  return { chosen: ranked[0]!.spec, ranked };
}

/**
 * One-line explanation of why a component won, for the generation trace.
 */
export function explainChoice(result: RankResult): string {
  const winner = result.ranked[0];
  if (!winner) return "no candidates";
  const runnerUp = result.ranked[1];
  const top = [...winner.terms]
    .filter((term) => term.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)
    .map((term) => `${term.name} ${term.delta > 0 ? "+" : ""}${term.delta}`)
    .join(", ");
  const margin = runnerUp
    ? ` (beat ${runnerUp.spec.id} by ${(winner.total - runnerUp.total).toFixed(1)})`
    : " (only candidate)";
  return `${winner.spec.id} ${winner.total.toFixed(1)}${margin} — ${top}`;
}
