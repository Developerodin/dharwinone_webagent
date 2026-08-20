import { parsePageFamily, type PageFamily } from "../config/pageFamily.js";
import { applyEditOps } from "./applyEditOps.js";
import {
  checkUnsupportedEdit,
  inferThemeFromColorLanguage,
} from "./checkEditCapability.js";
import { checkThemeEditScope } from "./checkScope.js";
import {
  parseEditOps,
  parseEditOpsFixture,
} from "./parseEditOps.js";
import { parseTargetedEditOpsFixture } from "./parseTargetedEditOps.js";
import { pinTargetedEditOps } from "./pinTargetedEditOps.js";
import { resolveThemeFamilyIntent } from "./resolveThemeIntent.js";
import {
  defaultCopyField,
  extractMaxWords,
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
  resolveEditTarget,
} from "./resolveEditTarget.js";
import { briefSchema, coerceBriefInput } from "../schemas/brief.schema.js";
import {
  creativeDirectionSchema,
  type CreativeDirection,
} from "../schemas/creativeDirection.schema.js";
import {
  editOpSchema,
  type EditOp,
} from "../schemas/editOps.schema.js";
import {
  pageSchema,
  sectionTypeSchema,
  type SectionType,
} from "../schemas/page.schema.js";
import { z } from "zod";

const CONFIDENCE_ASK = 0.7;

/**
 * Resolves ops from deterministic panel payload or natural-language parse.
 */
async function resolveOps(args: {
  instruction: string;
  ops?: EditOp[];
  targetSection?: SectionType;
  targetField?: string;
  page: z.infer<typeof pageSchema>;
  brief: z.infer<typeof briefSchema>;
  family: PageFamily;
  useFixture: boolean;
}): Promise<{
  ops: EditOp[];
  summary: string;
  needsConfirmation?: {
    question: string;
    candidates: SectionType[];
  };
}> {
  if (args.ops && args.ops.length > 0) {
    return { ops: args.ops, summary: `Applied ${args.ops.length} edit(s).` };
  }

  if (!args.instruction) {
    return { ops: [], summary: "No instruction or ops provided." };
  }

  const parsed = args.useFixture
    ? args.targetSection
      ? parseTargetedEditOpsFixture({
          instruction: args.instruction,
          targetSection: args.targetSection,
          targetField: args.targetField,
        })
      : parseEditOpsFixture(args.instruction, args.page)
    : await parseEditOps({
        instruction: args.instruction,
        page: args.page,
        brief: args.brief,
        family: args.family,
        targetSection: args.targetSection,
        targetField: args.targetField,
      });

  const ops: EditOp[] = args.targetSection
    ? pinTargetedEditOps(
        [...parsed.ops],
        args.targetSection,
        args.targetField,
        args.instruction,
      )
    : [...parsed.ops];

  // When click-scoped, skip retargeting; inject copy/cycle ops if the parser was empty.
  if (args.targetSection) {
    if (ops.length === 0 && isCycleSectionComponentIntent(args.instruction)) {
      ops.push({
        op: "cycle_section_component",
        section: args.targetSection,
      });
    }

    if (ops.length === 0 && isRewriteCopyIntent(args.instruction)) {
      const field =
        args.targetField ??
        defaultCopyField(args.targetSection, args.instruction);
      ops.push({
        op: "rewrite_copy",
        section: args.targetSection,
        field,
        maxWords: extractMaxWords(args.instruction),
        hint: args.instruction,
      });
    }

    return { ops, summary: parsed.summary };
  }

  // Unscoped: theme intent (single inject path — not duplicated in route after parse).
  const inferredTheme =
    resolveThemeFamilyIntent(args.instruction) ??
    inferThemeFromColorLanguage(args.instruction);
  if (inferredTheme && !ops.some((op) => op.op === "set_theme")) {
    ops.push({ op: "set_theme", family: inferredTheme });
  }

  if (ops.length === 0 && isCycleSectionComponentIntent(args.instruction)) {
    const target = resolveEditTarget(args.instruction, args.page);
    if (target.confidence < CONFIDENCE_ASK) {
      return {
        ops: [],
        summary: parsed.summary,
        needsConfirmation: {
          question: `Did you mean the ${target.section} section?`,
          candidates: [target.section],
        },
      };
    }
    ops.push({
      op: "cycle_section_component",
      section: target.section,
    });
  }

  if (ops.length === 0 && isRewriteCopyIntent(args.instruction)) {
    const target = resolveEditTarget(args.instruction, args.page);
    if (target.confidence < CONFIDENCE_ASK) {
      return {
        ops: [],
        summary: parsed.summary,
        needsConfirmation: {
          question: `Did you mean the ${target.section} section?`,
          candidates: [target.section],
        },
      };
    }
    const field =
      target.field ?? defaultCopyField(target.section, args.instruction);
    ops.push({
      op: "rewrite_copy",
      section: target.section,
      field,
      maxWords: extractMaxWords(args.instruction),
      hint: args.instruction,
    });
  }

  return { ops, summary: parsed.summary };
}

export type EditRequest = {
  instruction: string;
  ops: EditOp[];
  targetSection?: SectionType;
  targetField?: string;
  page: z.infer<typeof pageSchema>;
  brief: z.infer<typeof briefSchema>;
  family: PageFamily;
  direction: CreativeDirection | null;
  useFixture: boolean;
};

/**
 * The outcome of an edit attempt.
 *
 * Three distinct shapes rather than one nullable blob, because the caller has
 * to treat them differently: only `applied` produces a new stored version.
 */
export type EditOutcome =
  | {
      kind: "noop";
      page: z.infer<typeof pageSchema>;
      brief: z.infer<typeof briefSchema>;
      family: PageFamily;
      direction: CreativeDirection | null;
      applied: EditOp[];
      summary: string;
    }
  | {
      kind: "confirm";
      question: string;
      candidates: SectionType[];
      page: z.infer<typeof pageSchema>;
      brief: z.infer<typeof briefSchema>;
      family: PageFamily;
      direction: CreativeDirection | null;
      applied: EditOp[];
      summary: string;
    }
  | {
      kind: "applied";
      page: z.infer<typeof pageSchema>;
      brief: z.infer<typeof briefSchema>;
      family: PageFamily;
      direction: CreativeDirection | null;
      applied: EditOp[];
      summary: string;
    };

/**
 * Runs an edit against a page and returns the outcome.
 *
 * Extracted from the route so the same pipeline serves both the legacy
 * client-supplied-page endpoint and the project-scoped one that loads the
 * document from the database. The logic is identical; only where the page
 * comes from, and what happens to the result, differ.
 */
export async function runEdit(request: EditRequest): Promise<EditOutcome> {
  const unchanged = {
    page: request.page,
    brief: request.brief,
    family: request.family,
    direction: request.direction,
    applied: [] as EditOp[],
  };

  if (request.instruction) {
    const unsupported = checkUnsupportedEdit(request.instruction);
    if (unsupported) {
      return { kind: "noop", ...unchanged, summary: unsupported };
    }

    const themeScope = checkThemeEditScope(request.instruction);
    if (!themeScope.ok) {
      return { kind: "noop", ...unchanged, summary: themeScope.message };
    }
  }

  const resolved = await resolveOps({
    instruction: request.instruction,
    ops: request.ops,
    targetSection: request.targetSection,
    targetField: request.targetField,
    page: request.page,
    brief: request.brief,
    family: request.family,
    useFixture: request.useFixture,
  });

  if (resolved.needsConfirmation) {
    return {
      kind: "confirm",
      question: resolved.needsConfirmation.question,
      candidates: resolved.needsConfirmation.candidates,
      ...unchanged,
      summary: resolved.needsConfirmation.question,
    };
  }

  if (resolved.ops.length === 0) {
    return { kind: "noop", ...unchanged, summary: resolved.summary };
  }

  const result = await applyEditOps({
    page: request.page,
    brief: request.brief,
    family: request.family,
    ops: resolved.ops,
    direction: request.direction,
  });

  return {
    kind: "applied",
    page: result.page,
    brief: result.brief,
    family: result.family,
    direction: result.direction,
    applied: result.applied,
    summary: result.notes.length > 0 ? result.notes.join(" ") : resolved.summary,
  };
}
