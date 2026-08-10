import { Router } from "express";
import { assessBrief } from "../pipeline/assessBrief.js";

export const intakeRouter = Router();

/**
 * Assesses Path A chat dump and returns clarification questions or a ready brief.
 * Query ?fixture=1 skips LLM for token-free testing.
 */
intakeRouter.post("/", async (req, res) => {
  try {
    const chatText =
      typeof req.body?.chatText === "string" ? req.body.chatText.trim() : "";

    if (!chatText) {
      res.status(400).json({
        ok: false,
        error: "chatText is required (Path A: one message dump).",
      });
      return;
    }

    const answers =
      req.body?.answers && typeof req.body.answers === "object"
        ? (req.body.answers as Record<string, string>)
        : undefined;

    const clarificationRound =
      typeof req.body?.clarificationRound === "number"
        ? req.body.clarificationRound
        : 0;

    const useFixture =
      req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true";

    const result = await assessBrief({
      chatText,
      answers,
      clarificationRound,
      useFixture,
    });

    if (result.status === "unsupported") {
      res.status(200).json({
        ok: true,
        status: "unsupported",
        message: result.message,
        clarificationRound: result.clarificationRound,
        enrichedChatText: result.enrichedChatText,
        meta: { fixture: useFixture },
      });
      return;
    }

    if (result.status === "needs_clarification") {
      res.status(200).json({
        ok: true,
        status: "needs_clarification",
        questions: result.questions,
        partialBrief: result.partialBrief,
        clarificationRound: result.clarificationRound,
        enrichedChatText: result.enrichedChatText,
        pageFamily: result.pageFamily,
        canSkip: result.canSkip,
        gaps: result.gaps,
        meta: { fixture: useFixture },
      });
      return;
    }

    res.status(200).json({
      ok: true,
      status: "ready",
      brief: result.brief,
      clarificationRound: result.clarificationRound,
      enrichedChatText: result.enrichedChatText,
      pageFamily: result.pageFamily,
      meta: { fixture: useFixture },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown intake error";
    console.error("[intake]", message);
    res.status(500).json({ ok: false, error: message });
  }
});
