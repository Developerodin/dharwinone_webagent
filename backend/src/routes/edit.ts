import { Router } from "express";
import { parsePageFamily, type PageFamily } from "../config/pageFamily.js";
import { runEdit } from "../pipeline/runEdit.js";
import { briefSchema, coerceBriefInput } from "../schemas/brief.schema.js";
import {
  creativeDirectionSchema,
  type CreativeDirection,
} from "../schemas/creativeDirection.schema.js";
import { editOpSchema } from "../schemas/editOps.schema.js";
import { pageSchema, sectionTypeSchema } from "../schemas/page.schema.js";
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

/**
 * Legacy edit endpoint: the client supplies the page and stores the result.
 *
 * Superseded by POST /api/projects/:id/edit, which loads the document from the
 * database and appends a version. Kept working so the app keeps functioning
 * during the migration; remove once nothing calls it.
 *
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

    const outcome = await runEdit({
      instruction,
      ops: directOps,
      targetSection,
      targetField,
      page: pageParsed.data,
      brief: briefParsed.data,
      family,
      direction,
      useFixture:
        req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true",
    });

    res.status(200).json({
      ok: true,
      ...(outcome.kind === "confirm"
        ? {
            needsConfirmation: true,
            question: outcome.question,
            candidates: outcome.candidates,
          }
        : {}),
      page: outcome.page,
      brief: outcome.brief,
      family: outcome.family,
      direction: outcome.direction,
      applied: outcome.applied,
      summary: outcome.summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown edit error";
    console.error("[edit]", message);
    res.status(500).json({ ok: false, error: message });
  }
});
