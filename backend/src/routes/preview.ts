import { Router, type NextFunction, type Request, type Response } from "express";
import { getPublicPreview } from "../projects/publicPreview.js";
import { badRequest } from "../lib/httpError.js";
import { ok } from "../lib/respond.js";

export const previewRouter = Router();

const PROJECT_ID_MAX = 64;

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

/**
 * Public site preview — no auth. Anyone with the URL can render the page.
 */
previewRouter.get(
  "/:id",
  handle(async (req, res) => {
    const id = String(req.params.id ?? "").trim();
    if (!id || id.length > PROJECT_ID_MAX) {
      throw badRequest("VALIDATION_ERROR", "Invalid preview id.");
    }

    const preview = await getPublicPreview(id);

    res.setHeader("Cache-Control", "public, max-age=15");
    ok(res, preview);
  }),
);
