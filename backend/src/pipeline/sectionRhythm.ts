import type {
  SectionPlanItem,
  DesignDensity,
} from "../schemas/creativeDirection.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import { stableHash } from "../lib/stableHash.js";

type Intent = SectionPlanItem["layoutIntent"];
type Surface = SectionPlanItem["background"];
type Emphasis = SectionPlanItem["emphasis"];
type Spacing = SectionPlanItem["spacing"];

/**
 * Layout intents each section type can actually render well. Selection picks
 * from this set, so a plan can never ask a menu grid to render as a marquee.
 */
const ALLOWED_INTENTS: Record<SectionType, Intent[]> = {
  header: ["band"],
  hero: ["full_bleed", "split_left", "split_right", "centered"],
  about: ["split_left", "split_right", "editorial_columns", "overlap"],
  services: ["grid", "editorial_columns", "band"],
  // No "centered": a centre-aligned price list reads as a poster, not a menu.
  menu: ["grid", "editorial_columns"],
  stats: ["band", "grid", "centered"],
  gallery: ["grid", "full_bleed", "marquee"],
  testimonials: ["centered", "editorial_columns", "grid"],
  team: ["grid", "split_left", "split_right"],
  reservation: ["band", "centered", "split_right"],
  location_map: ["split_left", "split_right", "band"],
  contact: ["split_left", "centered"],
  footer: ["band"],
};

/**
 * Surface programs for the body of the page. Each is a hand-checked rhythm that
 * alternates rather than running one flat slab, and each carries at least one
 * heavy band so the page has a spine. Chosen by seed, not at random.
 */
const SURFACE_PROGRAMS: Array<{ id: string; cycle: Surface[] }> = [
  { id: "alternating", cycle: ["base", "alt", "base", "alt", "base", "dark", "base", "alt"] },
  { id: "quiet-band", cycle: ["base", "base", "alt", "base", "dark", "base", "alt", "base"] },
  { id: "dark-spine", cycle: ["base", "dark", "base", "alt", "base", "dark", "alt", "base"] },
  { id: "accent-punch", cycle: ["base", "alt", "base", "accent", "base", "alt", "dark", "base"] },
  { id: "paper", cycle: ["base", "alt", "base", "base", "alt", "base", "dark", "alt"] },
  { id: "late-band", cycle: ["base", "base", "alt", "alt", "base", "dark", "base", "alt"] },
  { id: "early-dark", cycle: ["dark", "base", "alt", "base", "base", "alt", "dark", "base"] },
  { id: "accent-close", cycle: ["base", "alt", "base", "base", "dark", "base", "accent", "base"] },
];

/**
 * Intents where media sits *behind* the copy, so an "image" surface is
 * coherent. Every other intent places media beside or within the layout.
 */
const MEDIA_BEHIND_COPY_INTENTS: Intent[] = ["full_bleed", "centered", "overlap"];

/** Sections that must stay quiet so the signature can carry the page. */
const ALWAYS_QUIET: SectionType[] = ["header", "footer", "contact"];

/** Sections that read as proof and suit a heavier surface. */
const PROOF_SECTIONS: SectionType[] = ["stats", "testimonials", "reservation"];

export type RhythmInput = {
  /** Surface programs recently used by comparable sites, least-used first. */
  preferredPrograms?: readonly string[];
  sectionTypes: readonly SectionType[];
  seed: string;
  density: DesignDensity;
  /** The one section the direction wants to be memorable. */
  signatureSection?: SectionType | null;
  /** Existing plan from the LLM — valid choices are kept, flat ones repaired. */
  existing?: readonly SectionPlanItem[] | null;
};

/**
 * Picks a value from a list by seed, avoiding the previous pick when possible.
 */
function pickVaried<T>(options: readonly T[], seed: string, previous: T | null): T {
  if (options.length === 0) throw new Error("pickVaried needs options");
  if (options.length === 1) return options[0]!;
  const start = stableHash(seed) % options.length;
  for (let step = 0; step < options.length; step += 1) {
    const candidate = options[(start + step) % options.length]!;
    if (candidate !== previous) return candidate;
  }
  return options[start]!;
}

/**
 * True when a plan is effectively flat — one surface for the whole body. This is
 * the shape the old planner always produced, and the thing worth repairing.
 */
export function isFlatPlan(plan: readonly SectionPlanItem[]): boolean {
  const bodySurfaces = plan
    .filter((item) => item.type !== "header" && item.type !== "hero" && item.type !== "footer")
    .map((item) => item.background);
  if (bodySurfaces.length < 3) return false;
  return new Set(bodySurfaces).size <= 1;
}

/**
 * Maps emphasis and page density onto vertical spacing.
 */
function spacingFor(emphasis: Emphasis, density: DesignDensity): Spacing {
  // Density scales the actual rem values through --sec-density, so this enum
  // only carries *relative* rhythm. Letting density push every section to
  // "roomy" flattens the hierarchy it was supposed to sharpen.
  if (emphasis === "compact") return "tight";
  if (emphasis === "hero") return density === "compact" ? "normal" : "roomy";
  if (emphasis === "major") return density === "compact" ? "tight" : "roomy";
  return "normal";
}

/**
 * Assigns emphasis: exactly one hero, the signature promoted, shell compact.
 */
function emphasisFor(
  type: SectionType,
  index: number,
  signatureSection: SectionType | null | undefined,
): Emphasis {
  if (type === "header" || type === "footer") return "compact";
  if (type === "hero") return "hero";
  if (type === signatureSection) return "major";
  if (type === "about" || type === "menu" || type === "gallery") {
    return index <= 4 ? "major" : "standard";
  }
  if (type === "stats") return "compact";
  return "standard";
}

/**
 * Builds a varied, rule-checked composition plan for one page.
 *
 * Guarantees: exactly one hero emphasis; no three consecutive identical
 * surfaces; no two consecutive identical layout intents; a heavy band somewhere
 * in the body; spacing that follows emphasis and density.
 */
export function buildSectionRhythm(input: RhythmInput): SectionPlanItem[] {
  const { sectionTypes, seed, density, signatureSection } = input;

  // Seeded choice by default. When cross-build history is available, choose
  // among the least-used programs instead — still deterministic, just biased
  // away from rhythms that comparable sites are already saturated with.
  const pool = input.preferredPrograms?.length
    ? SURFACE_PROGRAMS.filter((item) =>
        input.preferredPrograms!.slice(0, 3).includes(item.id),
      )
    : SURFACE_PROGRAMS;
  const programs = pool.length > 0 ? pool : SURFACE_PROGRAMS;
  const program = programs[stableHash(`${seed}:surface`) % programs.length]!;

  const existingByType = new Map<SectionType, SectionPlanItem>();
  for (const item of input.existing ?? []) existingByType.set(item.type, item);
  const keepExistingSurfaces = input.existing?.length
    ? !isFlatPlan(input.existing)
    : false;

  const plan: SectionPlanItem[] = [];
  let bodyIndex = 0;
  let previousIntent: Intent | null = null;
  let previousSurface: Surface | null = null;
  let surfaceRunLength = 0;
  let hasHeavyBand = false;

  sectionTypes.forEach((type, index) => {
    const prior = existingByType.get(type);
    const emphasis = emphasisFor(type, index, signatureSection);

    // Layout intent — reuse the LLM's choice when this component can render it.
    const allowed = ALLOWED_INTENTS[type] ?? ["centered"];
    const priorIntentIsValid = prior ? allowed.includes(prior.layoutIntent) : false;
    let intent: Intent =
      priorIntentIsValid && prior!.layoutIntent !== previousIntent
        ? prior!.layoutIntent
        : pickVaried(allowed, `${seed}:${type}:intent`, previousIntent);
    if (intent === previousIntent && allowed.length > 1) {
      intent = pickVaried(
        allowed.filter((option) => option !== previousIntent),
        `${seed}:${type}:intent2`,
        null,
      );
    }

    // Surface — shell and hero are fixed; body follows the seeded program.
    let surface: Surface;
    if (type === "header") {
      surface = "base";
    } else if (type === "hero") {
      // An "image" surface means the media fills the band and copy sits over
      // it. A split or column composition puts the media *beside* the copy, so
      // the two cannot both be true — asking for them together leaves no
      // component able to render the section.
      surface = MEDIA_BEHIND_COPY_INTENTS.includes(intent)
        ? prior?.background === "dark" || prior?.background === "accent"
          ? prior.background
          : "image"
        : "base";
    } else if (type === "footer") {
      surface = "dark";
      hasHeavyBand = true;
    } else if (keepExistingSurfaces && prior) {
      surface = prior.background;
      bodyIndex += 1;
    } else if (ALWAYS_QUIET.includes(type)) {
      surface = "base";
      bodyIndex += 1;
    } else {
      surface = program.cycle[bodyIndex % program.cycle.length]!;
      bodyIndex += 1;
    }

    // Never let a surface run three deep — it reads as one undifferentiated slab.
    if (surface === previousSurface) {
      surfaceRunLength += 1;
      if (surfaceRunLength >= 2 && type !== "header" && type !== "footer") {
        surface = surface === "base" ? "alt" : "base";
        surfaceRunLength = 0;
      }
    } else {
      surfaceRunLength = 0;
    }
    if (surface === "dark" || surface === "accent") hasHeavyBand = true;

    plan.push({
      type,
      emphasis,
      layoutIntent: intent,
      background: surface,
      spacing: spacingFor(emphasis, density),
    });

    previousIntent = intent;
    previousSurface = surface;
  });

  // Guarantee a spine: if nothing heavy landed, promote a proof section.
  if (!hasHeavyBand) {
    const target =
      plan.find((item) => PROOF_SECTIONS.includes(item.type)) ??
      plan.find(
        (item) => !ALWAYS_QUIET.includes(item.type) && item.type !== "hero",
      );
    if (target) target.background = "dark";
  }

  return plan;
}

/**
 * Derives page density from brief price band and vibe words.
 */
export function densityFor(
  priceBand: string | null | undefined,
  vibe: readonly string[] | null | undefined,
): DesignDensity {
  const words = (vibe ?? []).join(" ").toLowerCase();
  if (priceBand === "fine_dining" || /\b(spare|quiet|restrained|minimal|calm)\b/.test(words)) {
    return "spacious";
  }
  if (priceBand === "budget" || /\b(loud|busy|quick|energetic|punchy)\b/.test(words)) {
    return "compact";
  }
  return "normal";
}

/**
 * Derives heading type scale from density and price band.
 */
export function typeScaleFor(
  density: DesignDensity,
  priceBand: string | null | undefined,
): "compact" | "normal" | "expressive" {
  if (density === "spacious") return "expressive";
  if (priceBand === "budget") return "compact";
  return "normal";
}

/** Ids of every surface program, for the diversity ledger. */
export function surfaceProgramIds(): string[] {
  return SURFACE_PROGRAMS.map((program) => program.id);
}

/** Which program a seed resolves to, for recording in the ledger. */
export function surfaceProgramFor(
  seed: string,
  preferred?: readonly string[],
): string {
  const pool = preferred?.length
    ? SURFACE_PROGRAMS.filter((item) => preferred.slice(0, 3).includes(item.id))
    : SURFACE_PROGRAMS;
  const programs = pool.length > 0 ? pool : SURFACE_PROGRAMS;
  return programs[stableHash(`${seed}:surface`) % programs.length]!.id;
}

export { ALLOWED_INTENTS, SURFACE_PROGRAMS };
