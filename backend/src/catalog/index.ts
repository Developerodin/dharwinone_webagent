import {
  componentSpecSchema,
  type ComponentSpec,
} from "../schemas/componentSpec.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import { PREMIUM_SPECS } from "./premium.specs.js";
import { ELEGANT_SPECS } from "./elegant.specs.js";
import { FAMILY_KIT_SPECS } from "./familyKit.specs.js";
import { BOLD_SPECS } from "./bold.specs.js";

/**
 * Everything the generator knows about components lives here.
 *
 * Adding a component is: implement it, register it in the frontend registry,
 * append a spec to the relevant `*.specs.ts` file. No generation code changes.
 */
const RAW_SPECS: ComponentSpec[] = [
  ...PREMIUM_SPECS,
  ...ELEGANT_SPECS,
  ...FAMILY_KIT_SPECS,
  ...BOLD_SPECS,
];

let cache: {
  byId: Map<string, ComponentSpec>;
  bySection: Map<SectionType, ComponentSpec[]>;
} | null = null;

/**
 * Validates every spec once and indexes them. A malformed spec is a build-time
 * error, not a silently skipped component.
 */
function build(): NonNullable<typeof cache> {
  if (cache) return cache;

  const byId = new Map<string, ComponentSpec>();
  const bySection = new Map<SectionType, ComponentSpec[]>();
  const problems: string[] = [];

  for (const raw of RAW_SPECS) {
    const parsed = componentSpecSchema.safeParse(raw);
    if (!parsed.success) {
      problems.push(
        `${(raw as { id?: string }).id ?? "<no id>"}: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join("; ")}`,
      );
      continue;
    }
    const spec = parsed.data;
    if (byId.has(spec.id)) {
      problems.push(`duplicate component id: ${spec.id}`);
      continue;
    }
    byId.set(spec.id, spec);
    const list = bySection.get(spec.section) ?? [];
    list.push(spec);
    bySection.set(spec.section, list);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid component catalog:\n  ${problems.join("\n  ")}`);
  }

  cache = { byId, bySection };
  return cache;
}

/** Every validated spec. */
export function allSpecs(): ComponentSpec[] {
  return [...build().byId.values()];
}

/** Looks up one component's spec, or null when it has not been migrated. */
export function getSpec(componentId: string): ComponentSpec | null {
  return build().byId.get(componentId) ?? null;
}

/** True when the catalog can serve this section for this family. */
export function catalogCovers(section: SectionType, family: string): boolean {
  return findCandidates({ section, family }).length > 0;
}

export type CandidateQuery = {
  section: SectionType;
  /** Only components written for this theme bundle. */
  family: string;
  industry?: string;
  /** Surface the plan wants this band on. */
  surface?: string;
  /** Content the brief can actually supply, for hard gating. */
  available?: {
    media?: number;
    listCounts?: Record<string, number>;
  };
};

/**
 * Hard filter: which components *could* render this section at all.
 *
 * Everything here is a capability question with a yes/no answer. Preference
 * questions ("which of these fits the Design DNA best") belong in ranking.
 */
export function findCandidates(query: CandidateQuery): ComponentSpec[] {
  const pool = build().bySection.get(query.section) ?? [];

  return pool.filter((spec) => {
    if (spec.family !== query.family) return false;

    if (query.industry && spec.industries?.exclude?.includes(query.industry)) {
      return false;
    }

    if (query.surface && !spec.surfaces.includes(query.surface as never)) {
      return false;
    }

    const available = query.available;
    if (available) {
      if (
        typeof available.media === "number" &&
        available.media < spec.media.min
      ) {
        return false;
      }
      if (spec.list) {
        const count = available.listCounts?.[spec.list.key] ?? 0;
        if (count < spec.list.min) return false;
      }
    }

    return true;
  });
}

export type ResolveResult = {
  candidates: ComponentSpec[];
  /** Which constraints had to be relaxed to find anything. */
  relaxed: string[];
};

/**
 * Finds candidates, relaxing soft capability constraints in a fixed order when
 * the strict query comes up empty.
 *
 * A section must always resolve to something renderable, but the order matters:
 * content requirements are relaxed last because a component whose required
 * content is missing renders visibly broken, whereas one on an unexpected
 * surface merely looks less considered.
 */
export function resolveCandidates(query: CandidateQuery): ResolveResult {
  const strict = findCandidates(query);
  if (strict.length > 0) return { candidates: strict, relaxed: [] };

  // 1. The planned surface — the section can be re-surfaced instead.
  const withoutSurface = findCandidates({ ...query, surface: undefined });
  if (withoutSurface.length > 0) {
    return { candidates: withoutSurface, relaxed: ["surface"] };
  }

  // 2. Media count — a component may run with fewer images than it prefers.
  const withoutMedia = findCandidates({
    ...query,
    surface: undefined,
    available: query.available
      ? { ...query.available, media: undefined }
      : undefined,
  });
  if (withoutMedia.length > 0) {
    return { candidates: withoutMedia, relaxed: ["surface", "media"] };
  }

  // 3. Everything except section and family.
  const anything = findCandidates({ section: query.section, family: query.family });
  return {
    candidates: anything,
    relaxed: anything.length > 0 ? ["surface", "media", "content"] : [],
  };
}

/**
 * Every component id that can fill this section, in a stable order.
 * Replaces the hardcoded `COMPONENT_VARIANTS` id table.
 */
export function listComponentIds(section: SectionType, family: string): string[] {
  return findCandidates({ section, family })
    .map((spec) => spec.id)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * A sensible component for a section when there is no plan to rank against —
 * adding a section during an edit, or building a default page. Prefers the
 * quietest implementation so a newly inserted band does not shout.
 */
export function defaultComponentId(
  section: SectionType,
  family: string,
): string | null {
  const candidates = findCandidates({ section, family });
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) =>
      a.visualWeight - b.visualWeight ||
      a.density - b.density ||
      a.id.localeCompare(b.id),
  )[0]!.id;
}
