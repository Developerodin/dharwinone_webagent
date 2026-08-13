import type { Response } from "express";
import { Router } from "express";
import { parsePageFamily } from "../config/pageFamily.js";
import { inferPageFamily } from "../pipeline/inferPageFamily.js";
import { runPipeline } from "../pipeline/runPipeline.js";
import type { Brief } from "../schemas/brief.schema.js";
import { briefSchema, coerceBriefInput } from "../schemas/brief.schema.js";

export const buildRouter = Router();

type BuildBody = {
  chatText?: string;
  brief?: Brief;
  confirmed?: boolean;
  family?: string;
};

/**
 * Writes an SSE event frame to the response stream.
 */
function writeSse(res: Response, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Accepts a confirmed brief and runs the build pipeline (incl. Creative Director).
 * Query ?fixture=1 or USE_FIXTURE_BRIEF=true skips LLM for testing.
 * Query ?stream=1 emits stage events via SSE.
 */
buildRouter.post("/", async (req, res) => {
  try {
    const body = req.body as BuildBody;
    const confirmed = body.confirmed === true;

    if (!confirmed) {
      res.status(400).json({
        ok: false,
        error:
          "Brief must be confirmed before building. Run /api/intake first and set confirmed: true.",
      });
      return;
    }

    const chatText =
      typeof body.chatText === "string" ? body.chatText.trim() : "";

    let brief: Brief | undefined;
    if (body.brief) {
      const parsed = briefSchema.safeParse(coerceBriefInput(body.brief));
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: "Invalid brief payload.",
        });
        return;
      }
      brief = parsed.data;
    }

    if (!brief && !chatText) {
      res.status(400).json({
        ok: false,
        error: "chatText or brief is required.",
      });
      return;
    }

    const useFixture =
      req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true";
    const stream = req.query.stream === "1";
    const family =
      parsePageFamily(body.family) ??
      parsePageFamily(req.query.family) ??
      (brief ? inferPageFamily(brief, chatText) : undefined);

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
    }

    const result = await runPipeline({
      chatText: chatText || "confirmed brief build",
      useFixture,
      brief,
      family,
      onStage: stream
        ? (stage) => {
            writeSse(res, { type: "stage", stage });
          }
        : undefined,
    });

    const payload = {
      ok: true,
      page: result.page,
      brief: result.brief,
      direction: result.direction,
      meta: {
        droppedSections: result.droppedSections,
        fixture: useFixture,
        family: result.family,
        businessName: result.brief.businessName,
        stages: result.stages,
      },
    };

    if (stream) {
      writeSse(res, { type: "complete", ...payload });
      res.end();
      return;
    }

    res.status(200).json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown build error";
    console.error("[build]", message);

    if (req.query.stream === "1" && res.headersSent) {
      writeSse(res, { type: "error", ok: false, error: message });
      res.end();
      return;
    }

    res.status(500).json({ ok: false, error: message });
  }
});
