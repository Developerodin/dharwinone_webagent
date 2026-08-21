import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authEnv } from "./config/env.js";
import { printPreflight, runPreflight } from "./config/preflight.js";
import { pruneOtpCodes } from "./auth/otp.js";
import { pruneSessions } from "./auth/sessions.js";
import { collectOrphanAssets } from "./assets/service.js";
import { reconcileStaleJobs } from "./jobs/buildJobs.js";
import {
  pruneAllProjectVersions,
  pruneChatMessages,
  purgeExpiredProjects,
} from "./projects/maintenance.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth, requireVerified } from "./middleware/requireAuth.js";
import { pruneIdempotencyRecords } from "./middleware/idempotency.js";
import { askRouter } from "./routes/ask.js";
import { assetsRouter } from "./routes/assets.js";
import { projectsRouter } from "./routes/projects.js";
import { authRouter } from "./routes/auth.js";
import { buildRouter } from "./routes/build.js";
import { editRouter } from "./routes/edit.js";
import { healthRouter } from "./routes/health.js";
import { intakeRouter } from "./routes/intake.js";
import { leadsRouter } from "./routes/leads.js";
import { mapsRouter } from "./routes/maps.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { previewRouter } from "./routes/preview.js";
import { uploadRouter } from "./routes/upload.js";

const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const IMAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../data/images");

/**
 * Auth bodies are credentials and six-digit codes — kilobytes at most.
 * The pipeline's 80mb allowance exists for base64 hero images and must not
 * apply here: an 80mb login body is free memory exhaustion.
 */
const AUTH_BODY_LIMIT = "16kb";

/**
 * Boots the Express API for the test-phase pipeline.
 */
function createApp() {
  const app = express();

  // Rate limiting and session records key off the client IP. Behind a load
  // balancer every request originates from the proxy, so X-Forwarded-For must
  // be trusted — but only one hop, or the header becomes spoofable.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // The API serves JSON and images, never HTML, so CSP here would only
      // constrain the static image route. The SPA sets its own.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      // Required for the refresh cookie to travel on /api/auth requests.
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    }),
  );

  app.use(cookieParser());

  /** Serves local restaurant catalog images at /images/* */
  app.use("/images", express.static(IMAGE_ROOT));

  app.use("/api/health", healthRouter);

  // Shareable full-site preview. Ungated on purpose: the URL is the access
  // control, and the payload is only the rendered page (no chat, no owner).
  app.use("/api/preview", previewRouter);

  // Mounted before the 80mb parser so auth keeps its own tight limit.
  app.use("/api/auth/onboarding", express.json({ limit: AUTH_BODY_LIMIT }), onboardingRouter);
  app.use("/api/auth", express.json({ limit: AUTH_BODY_LIMIT }), authRouter);

  // Project and asset bodies are metadata, not documents — a saved page is
  // capped at 1 MB by pageGuards, and media never travels through this process
  // now that uploads are presigned. Mounted BEFORE the 80mb parser below:
  // whichever json() runs first consumes the body, so a route-specific limit
  // placed after the global one has no effect at all.
  app.use("/api/projects", express.json({ limit: "2mb" }), projectsRouter);
  app.use("/api/assets", express.json({ limit: "64kb" }), assetsRouter);

  // Legacy pipeline routes still accept base64 data-URLs, which are ~33%
  // larger than the file. This allowance goes away with the server-authoritative
  // edit refactor.
  app.use(express.json({ limit: "80mb" }));

  // Legacy pipeline routes. Superseded by the project-scoped equivalents, but
  // still reachable, so they are gated: every one of these either spends OpenAI
  // tokens or writes to disk, and an ungated LLM endpoint is someone else's
  // bill. They are authenticated but NOT project-scoped, which is exactly why
  // they should be deleted once nothing calls them.
  const legacyPipeline = [requireAuth, requireVerified];

  app.use("/api/intake", legacyPipeline, intakeRouter);
  app.use("/api/build", legacyPipeline, buildRouter);
  app.use("/api/edit", legacyPipeline, editRouter);
  app.use("/api/ask", legacyPipeline, askRouter);
  app.use("/api/upload", legacyPipeline, uploadRouter);

  // Maps config/search is read-only and used by the location picker inside the
  // authenticated builder; leads is a public form on published sites.
  app.use("/api/maps", requireAuth, mapsRouter);
  app.use("/api/leads", leadsRouter);

  app.use(errorHandler);

  return app;
}

/**
 * Removes expired sessions, codes, trashed projects, old versions and orphaned
 * assets.
 *
 * Runs on boot and daily. `unref()` keeps the timer from holding the process
 * open during shutdown or in tests.
 */
function startMaintenance(): void {
  const sweep = async () => {
    try {
      // Sequential, not Promise.all: these are background chores competing with
      // real requests for the same connection pool, and finishing a minute
      // later costs nothing.
      const counts = {
        sessions: await pruneSessions(),
        codes: await pruneOtpCodes(),
        idempotency: await pruneIdempotencyRecords(),
        projects: await purgeExpiredProjects(),
        versions: await pruneAllProjectVersions(),
        messages: await pruneChatMessages(),
        assets: await collectOrphanAssets(),
        // Builds whose process died mid-pipeline. Without this a crash leaves
        // rows that claim to be running forever, and every client that
        // reattaches waits on a pipeline nobody is executing.
        staleBuilds: await reconcileStaleJobs(),
      };

      const removed = Object.entries(counts).filter(([, n]) => n > 0);
      if (removed.length > 0) {
        console.log(
          "[maintenance] " +
            removed.map(([name, n]) => `${name}=${n}`).join(" "),
        );
      }
    } catch (error) {
      console.error("[maintenance] sweep failed:", error);
    }
  };

  void sweep();
  setInterval(sweep, 24 * 60 * 60 * 1000).unref();
}

// Validate auth configuration before binding a port: a misconfigured deploy
// should fail immediately, not at a user's first login attempt.
authEnv();

const app = createApp();

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);

  // Probe every dependency and print the result. Deliberately after listen():
  // the checks reach out over the network, and blocking the port on a slow
  // third party would make a degraded dependency look like a dead server.
  void runPreflight()
    .then((results) => {
      printPreflight(results);
      if (results.some((result) => result.status === "fail")) {
        console.log(
          "  Some dependencies are failing. The server is running, but the",
        );
        console.log(
          "  features that depend on them will not work until they are fixed.\n",
        );
      }
      startMaintenance();
    })
    .catch((error) => {
      console.error("[preflight] checks could not run:", error);
      startMaintenance();
    });
});
