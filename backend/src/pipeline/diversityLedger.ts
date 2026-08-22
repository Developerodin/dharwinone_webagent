import type { SectionType } from "../schemas/page.schema.js";

/**
 * What one finished build looked like, reduced to the signals worth comparing
 * against future builds.
 */
export type BuildFingerprint = {
  /** Builds only compete for novelty against comparable builds. */
  cohort: string;
  /** Component ids used anywhere in the site. */
  components: string[];
  /** Composition chosen per section role. */
  layoutsBySection: Array<{ section: SectionType; layoutFamily: string }>;
  /** Ordered layout families of the home page — the page's structural shape. */
  compositionSignature: string;
  /** Seeded surface program the rhythm planner used. */
  surfaceProgram?: string;
  typePairId?: string;
};

/**
 * Cross-build memory. Deliberately an interface: the in-memory implementation
 * is enough for a single server process, and a database-backed one can be
 * dropped in later without touching ranking.
 */
export interface DiversityLedger {
  record(fingerprint: BuildFingerprint): void;
  /** Builds in exactly this cohort. */
  recent(cohort: string): readonly BuildFingerprint[];
  /**
   * Builds in every cohort under a family. Needed because the surface rhythm is
   * chosen before the archetype is known, so it can only be compared at the
   * family level.
   */
  recentByFamily(family: string): readonly BuildFingerprint[];
}

/** A ledger that remembers nothing — the default, so behaviour stays pure. */
export const NULL_LEDGER: DiversityLedger = {
  record: () => undefined,
  recent: () => [],
  recentByFamily: () => [],
};

/**
 * Keeps the last N builds per cohort in process memory.
 */
export class InMemoryDiversityLedger implements DiversityLedger {
  private readonly byCohort = new Map<string, BuildFingerprint[]>();

  constructor(private readonly limit = 12) {}

  /**
   * Records a build, evicting the oldest once the cohort is full.
   */
  record(fingerprint: BuildFingerprint): void {
    const list = this.byCohort.get(fingerprint.cohort) ?? [];
    list.push(fingerprint);
    if (list.length > this.limit) list.shift();
    this.byCohort.set(fingerprint.cohort, list);
  }

  recent(cohort: string): readonly BuildFingerprint[] {
    return this.byCohort.get(cohort) ?? [];
  }

  recentByFamily(family: string): readonly BuildFingerprint[] {
    const prefix = `${family}:`;
    const out: BuildFingerprint[] = [];
    for (const [cohort, builds] of this.byCohort) {
      if (cohort.startsWith(prefix)) out.push(...builds);
    }
    return out;
  }
}

/**
 * How saturated each choice already is within a cohort, as rates in 0..1.
 *
 * Rates rather than counts so the pressure a signal exerts does not grow
 * without bound as the ledger fills — twenty identical builds should not be
 * able to outweigh a hard capability match.
 */
export type DiversityPressure = {
  /** Number of comparable builds this is measured against. */
  sampleSize: number;
  /** Share of recent builds that used this component. */
  componentRate(componentId: string): number;
  /** Share of recent builds that gave this section this composition. */
  layoutRate(section: SectionType, layoutFamily: string): number;
  /** Share of recent builds with this exact page shape. */
  compositionRate(signature: string): number;
  /** Surface programs ordered from least to most used. */
  leastUsedPrograms(candidates: readonly string[]): string[];
};

/**
 * Reads a cohort's history into the rates the ranker consumes.
 */
export function measurePressure(
  ledger: DiversityLedger,
  cohort: string,
  /** Compare across every cohort in the family rather than one exact cohort. */
  scope: "cohort" | "family" = "cohort",
): DiversityPressure {
  const builds =
    scope === "family"
      ? ledger.recentByFamily(cohort.split(":")[0]!)
      : ledger.recent(cohort);
  const total = builds.length;

  const componentCounts = new Map<string, number>();
  const layoutCounts = new Map<string, number>();
  const compositionCounts = new Map<string, number>();
  const programCounts = new Map<string, number>();

  for (const build of builds) {
    for (const id of new Set(build.components)) {
      componentCounts.set(id, (componentCounts.get(id) ?? 0) + 1);
    }
    for (const entry of build.layoutsBySection) {
      const key = `${entry.section}:${entry.layoutFamily}`;
      layoutCounts.set(key, (layoutCounts.get(key) ?? 0) + 1);
    }
    compositionCounts.set(
      build.compositionSignature,
      (compositionCounts.get(build.compositionSignature) ?? 0) + 1,
    );
    if (build.surfaceProgram) {
      programCounts.set(
        build.surfaceProgram,
        (programCounts.get(build.surfaceProgram) ?? 0) + 1,
      );
    }
  }

  const rate = (counts: Map<string, number>, key: string): number =>
    total === 0 ? 0 : (counts.get(key) ?? 0) / total;

  return {
    sampleSize: total,
    componentRate: (id) => rate(componentCounts, id),
    layoutRate: (section, layoutFamily) =>
      rate(layoutCounts, `${section}:${layoutFamily}`),
    compositionRate: (signature) => rate(compositionCounts, signature),
    leastUsedPrograms: (candidates) =>
      [...candidates].sort(
        (a, b) =>
          (programCounts.get(a) ?? 0) - (programCounts.get(b) ?? 0) ||
          a.localeCompare(b),
      ),
  };
}

/**
 * Cohort key. Diversity is only meaningful between sites a viewer could
 * plausibly compare: the same theme family telling the same kind of story.
 * A bakery and a fine-dining room are already different and should not be
 * pushed apart further.
 */
export function cohortKey(family: string, archetype: string | undefined): string {
  return `${family}:${archetype ?? "unknown"}`;
}

/** Process-wide ledger, so one server accumulates history across builds. */
let shared: DiversityLedger | null = null;

/**
 * The ledger used when a caller does not supply one.
 */
export function getSharedLedger(): DiversityLedger {
  shared ??= new InMemoryDiversityLedger();
  return shared;
}

/** Resets the shared ledger. Tests only. */
export function resetSharedLedger(): void {
  shared = null;
}
