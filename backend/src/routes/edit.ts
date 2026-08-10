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
  extractQuotedPhrase,
  findCopyTarget,
  inferEditSection,
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
} from "../pipeline/resolveEditTarget.js";
import { briefSchema } from "../schemas/brief.schema.js";
import type { EditOp } from "../schemas/editOps.schema.js";
import { pageSchema } from "../schemas/page.schema.js";

export const editRouter = Router();

type EditBody = {
  instruction?: string;
  page?: unknown;
  brief?: unknown;
  family?: unknown;
};

/**
 * Applies natural-language edits to an existing built page.
 * Query ?fixture=1 uses regex parsing instead of OpenAI.
 */
editRouter.post("/", async (req, res) => {
  try {
    const body = req.body as EditBody;
    const instruction =
      typeof body.instruction === "string" ? body.instruction.trim() : "";

    if (!instruction) {
      res.status(400).json({ ok: false, error: "instruction is required." });
      return;
    }

    const pageParsed = pageSchema.safeParse(body.page);
    if (!pageParsed.success) {
      res.status(400).json({ ok: false, error: "Invalid page payload." });
      return;
    }

    const briefParsed = briefSchema.safeParse(body.brief);
    if (!briefParsed.success) {
      res.status(400).json({ ok: false, error: "Invalid brief payload." });
      return;
    }

    const family: PageFamily =
      parsePageFamily(body.family) ??
      parsePageFamily(req.query.family) ??
      "premium";

    const unsupported = checkUnsupportedEdit(instruction);
    if (unsupported) {
      res.status(200).json({
        ok: true,
        page: pageParsed.data,
        brief: briefParsed.data,
        family,
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
        applied: [],
        summary: themeScope.message,
      });
      return;
    }

    const useFixture =
      req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true";

    const parsed = useFixture
      ? parseEditOpsFixture(instruction, pageParsed.data)
      : await parseEditOps({
          instruction,
          page: pageParsed.data,
          brief: briefParsed.data,
          family,
        });

    // Deterministic theme intent (typos + "use Elegant") — do not trust LLM summary alone
    const inferredTheme =
      resolveThemeFamilyIntent(instruction) ??
      inferThemeFromColorLanguage(instruction);
    const ops: EditOp[] = [...parsed.ops];
    if (inferredTheme && !ops.some((op) => op.op === "set_theme")) {
      ops.push({ op: "set_theme", family: inferredTheme });
    }

    if (
      ops.length === 0 &&
      isCycleSectionComponentIntent(instruction)
    ) {
      ops.push({
        op: "cycle_section_component",
        section: inferEditSection(instruction, "about"),
      });
    }

    // Extra safety: rewrite intents with no ops yet
    if (ops.length === 0 && isRewriteCopyIntent(instruction)) {
      const quoted = extractQuotedPhrase(instruction);
      const matched = quoted
        ? findCopyTarget(pageParsed.data, quoted)
        : null;
      const section =
        matched?.section ?? inferEditSection(instruction, "hero");
      const field =
        matched?.field ?? defaultCopyField(section, instruction);
      ops.push({
        op: "rewrite_copy",
        section,
        field,
        maxWords: extractMaxWords(instruction),
        hint: instruction,
      });
    }

    if (ops.length === 0) {
      res.status(200).json({
        ok: true,
        page: pageParsed.data,
        brief: briefParsed.data,
        family,
        applied: [],
        summary: parsed.summary,
      });
      return;
    }

    const result = await applyEditOps({
      page: pageParsed.data,
      brief: briefParsed.data,
      family,
      ops,
    });

    const summary =
      result.notes.length > 0 ? result.notes.join(" ") : parsed.summary;

    res.status(200).json({
      ok: true,
      page: result.page,
      brief: result.brief,
      family: result.family,
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
