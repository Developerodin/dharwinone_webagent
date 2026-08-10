import { Router } from "express";

export const healthRouter = Router();

/**
 * Liveness check for the backend template.
 */
healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "prowplus-backend",
    phase: "5-mvp-wired",
  });
});
