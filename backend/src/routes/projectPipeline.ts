import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { parsePageFamily } from "../config/pageFamily.js";
import { badRequest, conflict, notFound } from "../lib/httpError.js";
import { ok } from "../lib/respond.js";
import { idempotent } from "../middleware/idempotency.js";
import { requireAuth, requireVerified } from "../middleware/requireAuth.js";
import { inferPageFamily } from "../pipeline/inferPageFamily.js";
import { runEdit } from "../pipeline/runEdit.js";
import { runPipeline } from "../pipeline/runPipeline.js";
import { appendMessages, listMessages } from "../projects/messages.js";
import * as repo from "../projects/repo.js";
import { briefSchema, coerceBriefInput } from "../schemas/brief.schema.js";
import { creativeDirectionSchema } from "../schemas/creativeDirection.schema.js";
import { editOpSchema } from "../schemas/editOps.schema.js";
import { pageSchema, sectionTypeSchema } from "../schemas/page.schema.js";
import { pageFamilySchema } from "../schemas/project.schema.js";

/**
 * Project-scoped build and edit.
 *
 * The difference from /api/build and /api/edit is where the document lives.
 * Here the server loads the current page from the database, runs the pipeline,
 * and appends an immutable version. The client sends an intent, not a document,
 * so it can no longer overwrite a concurrent change or post a page we never
 * produced.
 */
export const projectPipelineRouter = Router({ mergeParams: true });

/**
 * Wraps an async handler so rejections reach the error middleware.
 */
function handle(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

projectPipelineRouter.use(requireAuth, requireVerified);

const buildBodySchema = z.object({
  chatText: z.string().max(20000).optional(),
  brief: z.unknown().optional(),
  confirmed: z.literal(true),
  family: pageFamilySchema.optional(),
});

const editBodySchema = z.object({
  instruction: z.string().trim().max(4000).optional(),
  ops: z.array(editOpSchema).optional(),
  targetSection: sectionTypeSchema.optional(),
  targetField: z.string().trim().max(120).optional(),
  /** The version the client believes is current. */
  expectedVersion: z.number().int().min(0).optional(),
});

const messagesBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "agent"]),
        content: z.string().max(20000),
        payload: z.unknown().optional(),
      }),
    )
    .max(50),
});

/**
 * Builds a page and stores it as a new version.
 *
 * Streams stage events over SSE when `?stream=1`, but the version is written
 * regardless of whether the client is still listening — the pipeline costs real
 * tokens, and losing the result because a tab closed is not acceptable.
 */
projectPipelineRouter.post(
  "/build",
  idempotent("projects.build"),
  handle(async (req, res) => {
    const projectId = req.params.id!;
    const userId = req.auth!.sub;
    const body = buildBodySchema.parse(req.body);

    const project = await repo.requireProject(userId, projectId);

    let brief;
    if (body.brief) {
      const parsed = briefSchema.safeParse(coerceBriefInput(body.brief));
      if (!parsed.success) {
        throw badRequest("VALIDATION_ERROR", "Invalid brief payload.");
      }
      brief = parsed.data;
    }

    const chatText = body.chatText?.trim() ?? "";
    if (!brief && !chatText) {
      throw badRequest("VALIDATION_ERROR", "chatText or brief is required.");
    }

    const useFixture =
      req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true";
    const stream = req.query.stream === "1";

    const family =
      parsePageFamily(body.family) ??
      parsePageFamily(project.pageFamily) ??
      (brief ? inferPageFamily(brief, chatText) : undefined);

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
    }

    /**
     * Emits an SSE frame, tolerating a client that has already disconnected.
     */
    const emit = (payload: unknown): void => {
      if (!stream || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const result = await runPipeline({
        chatText: chatText || "confirmed brief build",
        useFixture,
        brief,
        family,
        onStage: stream ? (stage) => emit({ type: "stage", stage }) : undefined,
      });

      const saved = await repo.appendVersion(userId, projectId, {
        page: result.page,
        brief: result.brief,
        direction: result.direction,
        pageFamily: result.family,
        source: "BUILD",
        summary: `Built ${result.brief.businessName ?? "page"}`,
        instruction: chatText || null,
        expectedVersion: project.currentVersion,
      });

      const payload = {
        ok: true,
        page: result.page,
        brief: result.brief,
        direction: result.direction,
        version: saved.version.version,
        project: saved.project,
        meta: {
          droppedSections: result.droppedSections,
          fixture: useFixture,
          family: result.family,
          businessName: result.brief.businessName,
          stages: result.stages,
        },
      };

      if (stream) {
        emit({ type: "complete", ...payload });
        res.end();
        return;
      }

      ok(res, payload, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown build error";
      console.error("[projects.build]", message);

      if (stream && res.headersSent) {
        emit({ type: "error", ok: false, error: message });
        res.end();
        return;
      }
      throw error;
    }
  }),
);

/**
 * Applies an edit to the stored document and appends a version.
 *
 * Only an outcome that actually changed the page writes a version: a rejected
 * instruction, a request for clarification, or a parse that produced no ops all
 * leave history untouched.
 */
projectPipelineRouter.post(
  "/edit",
  idempotent("projects.edit"),
  handle(async (req, res) => {
    const projectId = req.params.id!;
    const userId = req.auth!.sub;
    const body = editBodySchema.parse(req.body);

    const instruction = body.instruction?.trim() ?? "";
    const ops = body.ops ?? [];

    if (!instruction && ops.length === 0) {
      throw badRequest("VALIDATION_ERROR", "instruction or ops is required.");
    }

    const project = await repo.requireProject(userId, projectId);
    const head = await repo.getHeadVersion(userId, projectId);

    if (!head) {
      throw notFound(
        "VERSION_NOT_FOUND",
        "This project has no page yet — build it first.",
      );
    }

    // Reject a stale edit before spending tokens on it, not after.
    if (
      body.expectedVersion !== undefined &&
      body.expectedVersion !== project.currentVersion
    ) {
      throw conflict("VERSION_CONFLICT", "This project was changed somewhere else.", {
        currentVersion: project.currentVersion,
        yourVersion: body.expectedVersion,
      });
    }

    const pageParsed = pageSchema.safeParse(head.page);
    const briefParsed = briefSchema.safeParse(
      coerceBriefInput(head.brief ?? project.brief),
    );

    if (!pageParsed.success || !briefParsed.success) {
      throw badRequest("INVALID_PAGE", "The stored page could not be read.");
    }

    const directionParsed = creativeDirectionSchema.safeParse(
      head.direction ?? project.direction,
    );

    const outcome = await runEdit({
      instruction,
      ops,
      targetSection: body.targetSection,
      targetField: body.targetField,
      page: pageParsed.data,
      brief: briefParsed.data,
      family: parsePageFamily(head.pageFamily) ?? "premium",
      direction: directionParsed.success ? directionParsed.data : null,
      useFixture:
        req.query.fixture === "1" || process.env.USE_FIXTURE_BRIEF === "true",
    });

    if (outcome.kind !== "applied") {
      ok(res, {
        applied: [],
        summary: outcome.summary,
        version: project.currentVersion,
        page: outcome.page,
        ...(outcome.kind === "confirm"
          ? {
              needsConfirmation: true,
              question: outcome.question,
              candidates: outcome.candidates,
            }
          : {}),
      });
      return;
    }

    const saved = await repo.appendVersion(userId, projectId, {
      page: outcome.page,
      brief: outcome.brief,
      direction: outcome.direction,
      pageFamily: outcome.family,
      source: "EDIT",
      summary: outcome.summary,
      instruction: instruction || null,
      expectedVersion: project.currentVersion,
    });

    ok(res, {
      page: outcome.page,
      brief: outcome.brief,
      family: outcome.family,
      direction: outcome.direction,
      applied: outcome.applied,
      summary: outcome.summary,
      version: saved.version.version,
      project: saved.project,
    });
  }),
);

projectPipelineRouter.get(
  "/messages",
  handle(async (req, res) => {
    const before = req.query.before ? Number(req.query.before) : undefined;
    const limit = Number(req.query.limit ?? 100);

    const messages = await listMessages(
      req.auth!.sub,
      req.params.id!,
      Number.isFinite(limit) ? limit : 100,
      Number.isFinite(before as number) ? before : undefined,
    );

    ok(res, { messages });
  }),
);

projectPipelineRouter.post(
  "/messages",
  handle(async (req, res) => {
    const body = messagesBodySchema.parse(req.body);
    const created = await appendMessages(
      req.auth!.sub,
      req.params.id!,
      body.messages,
    );
    ok(res, { messages: created }, 201);
  }),
);
