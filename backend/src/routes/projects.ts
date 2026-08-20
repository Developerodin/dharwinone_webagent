import { Router, type NextFunction, type Request, type Response } from "express";
import { ok } from "../lib/respond.js";
import { badRequest } from "../lib/httpError.js";
import { idempotent } from "../middleware/idempotency.js";
import { requireAuth, requireVerified } from "../middleware/requireAuth.js";
import { importProjects } from "../projects/import.js";
import * as repo from "../projects/repo.js";
import { projectPipelineRouter } from "./projectPipeline.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  renameProjectSchema,
  revertSchema,
  saveVersionSchema,
} from "../schemas/project.schema.js";

export const projectsRouter = Router();

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

projectsRouter.use(requireAuth, requireVerified);

// Build, edit and chat mount under /:id. Declared before the generic /:id
// handlers so a path like /:id/build is never swallowed by /:id.
projectsRouter.use("/:id", projectPipelineRouter);

/**
 * Reads the authenticated user id.
 */
function userId(req: Request): string {
  return req.auth!.sub;
}

projectsRouter.get(
  "/",
  handle(async (req, res) => {
    const query = listProjectsQuerySchema.parse(req.query);

    const result = await repo.listProjects(userId(req), {
      status: query.status,
      query: query.q,
      limit: query.limit,
      cursor: query.cursor,
      trashed: query.trashed,
    });

    ok(res, { projects: result.projects }, 200, {
      nextCursor: result.nextCursor,
    });
  }),
);

/**
 * Takes ownership of projects built before the user had an account.
 *
 * Anyone could build a site with no account, and that work lives in one
 * browser's localStorage. Signing up must not discard it.
 */
projectsRouter.post(
  "/import",
  idempotent("projects.import"),
  handle(async (req, res) => {
    const result = await importProjects(userId(req), req.body?.projects);
    ok(res, result, 201);
  }),
);

projectsRouter.post(
  "/",
  idempotent("projects.create"),
  handle(async (req, res) => {
    const body = createProjectSchema.parse(req.body);
    const project = await repo.createProject(userId(req), body);
    ok(res, { project }, 201);
  }),
);

projectsRouter.get(
  "/:id",
  handle(async (req, res) => {
    const id = req.params.id!;
    const include = String(req.query.include ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const project = await repo.requireProject(userId(req), id);

    // Nothing heavy travels by default. The dashboard needs a project row; the
    // editor asks for the page explicitly.
    const page = include.includes("page")
      ? await repo.getHeadVersion(userId(req), id)
      : null;

    const versions = include.includes("versions")
      ? await repo.listVersions(userId(req), id, 20)
      : null;

    // Fire-and-forget: recording that a project was opened must not add
    // latency to opening it.
    void repo.touchLastOpened(userId(req), id);

    ok(res, {
      project,
      ...(page ? { page: page.page, version: page.version } : {}),
      ...(versions ? { versions } : {}),
    });
  }),
);

projectsRouter.patch(
  "/:id",
  handle(async (req, res) => {
    const body = renameProjectSchema.parse(req.body);
    const project = await repo.renameProject(userId(req), req.params.id!, body.name);
    ok(res, { project });
  }),
);

projectsRouter.delete(
  "/:id",
  handle(async (req, res) => {
    const result = await repo.softDeleteProject(userId(req), req.params.id!);
    ok(res, { deleted: true, purgeAfter: result.purgeAfter.toISOString() });
  }),
);

projectsRouter.post(
  "/:id/restore",
  handle(async (req, res) => {
    const project = await repo.restoreProject(userId(req), req.params.id!);
    ok(res, { project });
  }),
);

projectsRouter.post(
  "/:id/duplicate",
  idempotent("projects.duplicate"),
  handle(async (req, res) => {
    const project = await repo.duplicateProject(userId(req), req.params.id!);
    ok(res, { project }, 201);
  }),
);

/**
 * Saves a new document version.
 *
 * `expectedVersion` is how two tabs stay honest: a mismatch returns 409 with
 * the server's current version so the client can re-read and re-apply rather
 * than silently overwriting the other tab's work.
 */
projectsRouter.post(
  "/:id/versions",
  idempotent("projects.saveVersion"),
  handle(async (req, res) => {
    const body = saveVersionSchema.parse(req.body);

    const result = await repo.appendVersion(userId(req), req.params.id!, {
      page: body.page,
      brief: body.brief,
      direction: body.direction,
      pageFamily: body.pageFamily,
      source: "MANUAL",
      summary: body.summary ?? "Saved changes",
      instruction: body.instruction ?? null,
      expectedVersion: body.expectedVersion,
    });

    ok(res, {
      project: result.project,
      version: result.version.version,
      versionId: result.version.id,
    }, 201);
  }),
);

projectsRouter.get(
  "/:id/versions",
  handle(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const before = req.query.before ? Number(req.query.before) : undefined;

    const versions = await repo.listVersions(
      userId(req),
      req.params.id!,
      Number.isFinite(limit) ? limit : 50,
      Number.isFinite(before as number) ? before : undefined,
    );

    ok(res, { versions });
  }),
);

projectsRouter.get(
  "/:id/versions/:version",
  handle(async (req, res) => {
    const version = Number(req.params.version);

    if (!Number.isInteger(version) || version < 1) {
      throw badRequest("VALIDATION_ERROR", "Invalid version number.");
    }

    const found = await repo.getVersion(userId(req), req.params.id!, version);

    // Versions are immutable, so a fetched snapshot can be cached forever.
    // Private, because it is one user's document.
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

    ok(res, {
      version: found.version,
      page: found.page,
      brief: found.brief,
      direction: found.direction,
      pageFamily: found.pageFamily,
      summary: found.summary,
      createdAt: found.createdAt,
    });
  }),
);

projectsRouter.post(
  "/:id/revert",
  idempotent("projects.revert"),
  handle(async (req, res) => {
    const body = revertSchema.parse(req.body);

    const result = await repo.revertToVersion(
      userId(req),
      req.params.id!,
      body.toVersion,
      body.expectedVersion,
    );

    ok(res, {
      project: result.project,
      version: result.version.version,
    });
  }),
);
