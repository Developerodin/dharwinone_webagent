import "dotenv/config";
import cors from "cors";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { askRouter } from "./routes/ask.js";
import { buildRouter } from "./routes/build.js";
import { editRouter } from "./routes/edit.js";
import { healthRouter } from "./routes/health.js";
import { intakeRouter } from "./routes/intake.js";
import { uploadRouter } from "./routes/upload.js";

const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const IMAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../data/images");

/**
 * Boots the Express API for the test-phase pipeline.
 */
function createApp() {
  const app = express();

  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
    }),
  );
  // Base64 data-URLs are ~33% larger than the file; allow hero photos + short videos.
  app.use(express.json({ limit: "80mb" }));

  /** Serves local restaurant catalog images at /images/* */
  app.use("/images", express.static(IMAGE_ROOT));

  app.use("/api/health", healthRouter);
  app.use("/api/intake", intakeRouter);
  app.use("/api/build", buildRouter);
  app.use("/api/edit", editRouter);
  app.use("/api/ask", askRouter);
  app.use("/api/upload", uploadRouter);

  return app;
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
