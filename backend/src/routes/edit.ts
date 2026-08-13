import { Router } from "express";
import { parsePageFamily, type PageFamily } from "../config/pageFamily.js";
import { applyEditOps } from "../pipeline/applyEditOps.js";
import {
  checkUnsupportedEdit,
  inferThemeFromColorLanguage,
} from "../pipeline/checkEditCapability.js";
import { checkThemeEditScope } from "../pipeline/checkScope.js";
import {
  parseEditOps,
  parseEditOpsFixture,
} from "../pipeline/parseEditOps.js";
import { resolveThemeFamilyIntent } from "../pipeline/resolveThemeIntent.js";
import {
  defaultCopyField,
  extractMaxWords,
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
  resolveEditTarget,
} from "../pipeline/resolveEditTarget.js";
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

export const editRouter = Router();

type EditBody = {
  instruction?: string;
  ops?: unknown;
  targetSection?: unknown;
  targetField?: unknown;
  page?: unknown;
  brief?: unknown;
  family?: unknown;
  direction?: unknown;
};

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
    ? parseEditOpsFixture(args.instruction, args.page)
    : await parseEditOps({
        instruction: args.instruction,
        page: args.page,
        brief: args.brief,
        family: args.family,
      });

  const ops: EditOp[] = [...parsed.ops];

  // When click-scoped, force section on rewrite/set/cycle ops and skip retargeting.
  if (args.targetSection) {
    for (let i = 0; i < ops.length; i += 1) {
      const op = ops[i]!;
      if (
        "section" in op &&
        typeof op.section === "string" &&
        op.section !== args.targetSection
      ) {
        ops[i] = { ...op, section: args.targetSection } as EditOp;
      }
    }

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

/**
 * Applies natural-language or deterministic ops to an existing built page.
 * Query ?fixture=1 uses regex parsing instead of OpenAI.
 */
editRouter.post("/", async (req, res) => {
  try {
    const body = req.body as EditBody;
    const instruction =
      typeof body.instruction === "string" ? body.instruction.trim() : "";

    const pageParsed = pageSchema.safeParse(body.page);
    if (!pageParsed.success) {
      res.status(400).json({ ok: false, error: "Invalid page payload." });
      return;
    }

    const briefParsed = briefSchema.safeParse(coerceBriefInput(body.brief));
    if (!briefParsed.success) {
      res.status(400).json({ ok: false, error: "Invalid brief payload." });
      return;
    }

    const family: PageFamily =
      parsePageFamily(body.family) ??
      parsePageFamily(req.query.family) ??
      "premium";

    const opsParsed = z.array(editOpSchema).safeParse(body.ops ?? []);
    const directOps = opsParsed.success ? opsParsed.data : [];

    const targetSectionParsed = sectionTypeSchema.safeParse(body.targetSection);
    const targetSection = targetSectionParsed.success
      ? targetSectionParsed.data
      : undefined;
    const targetField =
      typeof body.targetField === "string" && body.targetField.trim()
        ? body.targetField.trim()
        : undefined;

    let direction: CreativeDirection | null = null;
    if (body.direction) {
      const dirParsed = creativeDirectionSchema.safeParse(body.direction);
      if (dirParsed.success) direction = dirParsed.data;
    }

    if (!instruction && directOps.length === 0) {
      res.status(400).json({
        ok: false,
        error: "instruction or ops is required.",
      });
      return;
    }

    if (instruction) {
      const unsupported = checkUnsupportedEdit(instruction);
      if (unsupported) {
        res.status(200).json({
          ok: true,
          page: pageParsed.data,
          brief: briefParsed.data,
          family,
          direction,
          applied: [],
          summary: unsupported,
        });
        return;
      }

      const themeScope = checkThemeEditScope(instruction);
      if (!themeScope.ok) {
        res.status(200).json({
          ok: true,
          page: pageParsed.data,
          brief: briefParsed.data,
          family,
          direction,
          applied: [],
          summary: themeScope.message,
        });
        return;
      }
    }

    const useFixture =
      req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true";

    const resolved = await resolveOps({
      instruction,
      ops: directOps,
      targetSection,
      targetField,
      page: pageParsed.data,
      brief: briefParsed.data,
      family,
      useFixture,
    });

    if (resolved.needsConfirmation) {
      res.status(200).json({
        ok: true,
        needsConfirmation: true,
        question: resolved.needsConfirmation.question,
        candidates: resolved.needsConfirmation.candidates,
        page: pageParsed.data,
        brief: briefParsed.data,
        family,
        direction,
        applied: [],
        summary: resolved.needsConfirmation.question,
      });
      return;
    }

    if (resolved.ops.length === 0) {
      res.status(200).json({
        ok: true,
        page: pageParsed.data,
        brief: briefParsed.data,
        family,
        direction,
        applied: [],
        summary: resolved.summary,
      });
      return;
    }

    const result = await applyEditOps({
      page: pageParsed.data,
      brief: briefParsed.data,
      family,
      ops: resolved.ops,
      direction,
    });

    const summary =
      result.notes.length > 0 ? result.notes.join(" ") : resolved.summary;

    res.status(200).json({
      ok: true,
      page: result.page,
      brief: result.brief,
      family: result.family,
      direction: result.direction,
      applied: result.applied,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown edit error";
    console.error("[edit]", message);
    res.status(500).json({ ok: false, error: message });
  }
});
