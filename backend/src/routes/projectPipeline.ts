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
import { assertBuildQuota } from "../projects/quota.js";
import { placeAsset, resolveAssetKey } from "../projects/mediaPlacement.js";
import * as jobs from "../jobs/buildJobs.js";
import { briefSchema, coerceBriefInput } from "../schemas/brief.schema.js";
import { creativeDirectionSchema } from "../schemas/creativeDirection.schema.js";
import { editOpSchema } from "../schemas/editOps.schema.js";
import { pageSchema, sectionTypeSchema } from "../schemas/page.schema.js";
import { pageFamilySchema, placeMediaSchema } from "../schemas/project.schema.js";
import * as assets from "../assets/service.js";

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
    await assertBuildQuota(userId);

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

    // The job row is what makes this build survivable. It is written before the
    // pipeline starts so a client that drops mid-build — or reloads, or moves
    // to another device — has something to reattach to.
    const job = await jobs.startJob({
      userId,
      projectId,
      chatText: chatText || null,
      pageFamily: family ?? null,
    });

    emit({ type: "job", jobId: job.id });

    try {
      const result = await runPipeline({
        chatText: chatText || "confirmed brief build",
        useFixture,
        brief,
        family,
        onStage: (stage) => {
          emit({ type: "stage", stage });
          void jobs.recordStage(job.id, stage as jobs.JobStage);
        },
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

      await jobs.completeJob(job.id, {
        version: saved.version.version,
        versionId: saved.version.id,
      });

      const payload = {
        ok: true,
        jobId: job.id,
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
      await jobs.failJob(job.id, message);

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

/**
 * Places an uploaded asset into the stored document and appends a version.
 *
 * The client sends an asset id and a slot — never a page. That is what keeps a
 * photo swap from carrying a stale copy of the whole document with it, and it
 * is what lets the version write link the asset so garbage collection knows the
 * file is in use.
 */
projectPipelineRouter.post(
  "/media",
  idempotent("projects.media"),
  handle(async (req, res) => {
    const projectId = req.params.id!;
    const userId = req.auth!.sub;
    const body = placeMediaSchema.parse(req.body);

    const project = await repo.requireProject(userId, projectId);
    const head = await repo.getHeadVersion(userId, projectId);

    if (!head) {
      throw notFound(
        "VERSION_NOT_FOUND",
        "This project has no page yet — build it first.",
      );
    }

    if (
      body.expectedVersion !== undefined &&
      body.expectedVersion !== project.currentVersion
    ) {
      throw conflict("VERSION_CONFLICT", "This project was changed somewhere else.", {
        currentVersion: project.currentVersion,
        yourVersion: body.expectedVersion,
      });
    }

    const asset = await assets.requireReadyAsset(userId, body.assetId);

    const pageParsed = pageSchema.safeParse(head.page);
    if (!pageParsed.success) {
      throw badRequest("INVALID_PAGE", "The stored page could not be read.");
    }

    const page = pageParsed.data;
    const assetKey = resolveAssetKey(page, body.section, body.assetKey);

    placeAsset(page, body.section, assetKey, asset.cdnUrl);

    const saved = await repo.appendVersion(userId, projectId, {
      page,
      brief: head.brief ?? project.brief ?? undefined,
      direction: head.direction ?? project.direction ?? undefined,
      pageFamily: parsePageFamily(head.pageFamily) ?? "premium",
      source: "EDIT",
      summary: `Updated ${body.section} media`,
      expectedVersion: project.currentVersion,
    });

    ok(res, {
      page,
      imagePath: asset.cdnUrl,
      mediaKind: asset.kind === "VIDEO" ? "video" : "image",
      assetKey,
      version: saved.version.version,
      project: saved.project,
    });
  }),
);

/**
 * Serializes a job for the client.
 */
function presentJob(job: {
  id: string;
  status: string;
  stages: unknown;
  version: number | null;
  error: string | null;
  chatText: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}) {
  return {
    jobId: job.id,
    status: job.status,
    stages: jobs.jobStages(job as never),
    version: job.version,
    error: job.error,
    chatText: job.chatText,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

/**
 * Reports the most recent build for a project.
 *
 * A reloaded tab asks this first: it is the difference between "your build is
 * still running, here is how far it got" and an editor that silently forgets
 * the user pressed Build ninety seconds ago.
 */
projectPipelineRouter.get(
  "/jobs/latest",
  handle(async (req, res) => {
    const userId = req.auth!.sub;
    await repo.requireProject(userId, req.params.id!);

    const job = await jobs.latestJob(userId, req.params.id!);

    if (!job) {
      ok(res, { job: null });
      return;
    }

    // A job whose process died is reported as failed rather than running, so
    // the client does not wait on a pipeline nobody is executing.
    if (jobs.isStale(job)) {
      await jobs.failJob(job.id, "The build stopped unexpectedly. Please try again.");
      ok(res, {
        job: presentJob({
          ...job,
          status: "FAILED",
          error: "The build stopped unexpectedly. Please try again.",
        }),
      });
      return;
    }

    ok(res, { job: presentJob(job) });
  }),
);

/**
 * Reattaches to a running build over SSE.
 *
 * Replays every stage already recorded, then tails the job row until it
 * reaches a terminal state. Tailing the row rather than an in-memory emitter
 * is deliberate: it works after a redeploy, and it works when the reconnect
 * lands on a different process than the one running the pipeline.
 */
projectPipelineRouter.get(
  "/jobs/:jobId/events",
  handle(async (req, res) => {
    const userId = req.auth!.sub;
    await repo.requireProject(userId, req.params.id!);

    const initial = await jobs.requireJob(userId, req.params.jobId!);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    const emit = (payload: unknown): void => {
      if (closed || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    emit({ type: "job", jobId: initial.id, resumed: true });

    let sent = 0;

    /**
     * Emits any stages the client has not seen yet.
     */
    const flushStages = (stages: jobs.JobStage[]): void => {
      for (const stage of stages.slice(sent)) emit({ type: "stage", stage });
      sent = Math.max(sent, stages.length);
    };

    /**
     * Sends the finished document, or the failure, and ends the stream.
     */
    const finish = async (job: {
      status: string;
      error: string | null;
      version: number | null;
    }): Promise<void> => {
      if (job.status === "SUCCEEDED") {
        const head = await repo.getHeadVersion(userId, req.params.id!);
        emit({
          type: "complete",
          ok: true,
          page: head?.page,
          brief: head?.brief,
          direction: head?.direction,
          version: head?.version,
          meta: { family: head?.pageFamily, resumed: true },
        });
      } else {
        emit({
          type: "error",
          ok: false,
          error: job.error ?? "The build did not finish.",
        });
      }
      res.end();
    };

    flushStages(jobs.jobStages(initial));

    if (initial.status !== "RUNNING" && initial.status !== "QUEUED") {
      await finish(initial);
      return;
    }

    // Poll rather than subscribe. At one build per user this costs a trivial
    // indexed read per second, and it removes any assumption that the pipeline
    // is running inside this process.
    const POLL_MS = 900;

    // Everything past this point runs with the response already open, so a
    // throw could not become an error status — the error middleware would try
    // to set headers that are long gone. Failures are reported in-band and the
    // stream is closed.
    try {
      while (!closed) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (closed) return;

        const job = await jobs.requireJob(userId, req.params.jobId!);
        flushStages(jobs.jobStages(job));

        if (jobs.isStale(job)) {
          await jobs.failJob(
            job.id,
            "The build stopped unexpectedly. Please try again.",
          );
          await finish({
            status: "FAILED",
            error: "The build stopped unexpectedly. Please try again.",
            version: null,
          });
          return;
        }

        if (job.status !== "RUNNING" && job.status !== "QUEUED") {
          await finish(job);
          return;
        }
      }
    } catch (error) {
      console.error("[projects.jobs.events]", error);
      emit({
        type: "error",
        ok: false,
        error: "Lost track of that build. Reopen the project to see where it got to.",
      });
      if (!res.writableEnded) res.end();
    }
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
