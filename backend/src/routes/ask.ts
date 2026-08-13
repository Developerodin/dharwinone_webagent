import { Router } from "express";
import { parsePageFamily, type PageFamily } from "../config/pageFamily.js";
import { runAskAgent } from "../pipeline/askAgent.js";
import { briefSchema, coerceBriefInput } from "../schemas/brief.schema.js";
import { pageSchema } from "../schemas/page.schema.js";

export const askRouter = Router();

type AskBody = {
  instruction?: string;
  page?: unknown;
  brief?: unknown;
  family?: unknown;
};

/**
 * Ask agent: classify intent, answer questions, propose confirmed edits.
 */
askRouter.post("/", async (req, res) => {
  try {
    const body = req.body as AskBody;
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

    const briefParsed = briefSchema.safeParse(coerceBriefInput(body.brief));
    if (!briefParsed.success) {
      res.status(400).json({ ok: false, error: "Invalid brief payload." });
      return;
    }

    const family: PageFamily =
      parsePageFamily(body.family) ??
      parsePageFamily(req.query.family) ??
      "premium";

    const useFixture =
      req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true";

    const result = await runAskAgent({
      instruction,
      page: pageParsed.data,
      brief: briefParsed.data,
      family,
      useFixture,
    });

    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("[ask]", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Ask agent failed.",
    });
  }
});
