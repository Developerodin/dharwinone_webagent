import type { PipelineStageName } from "./pipelineStages.js";

/** Inclusive delay band (ms) per stage — keeps UX in the ~3–10s range. */
const STAGE_DELAY_MS: Record<
  PipelineStageName,
  { min: number; max: number }
> = {
  "Brief Extractor": { min: 3000, max: 5500 },
  "Section Planner": { min: 3000, max: 5000 },
  "Component Picker": { min: 3500, max: 6500 },
  Copywriter: { min: 6000, max: 10000 },
  "Fact-Safety": { min: 4000, max: 7000 },
  "Image Picker": { min: 5000, max: 8500 },
  Assembler: { min: 6000, max: 10000 },
  Renderer: { min: 4000, max: 7500 },
};

/**
 * Returns whether artificial stage pacing is disabled (tests / explicit off).
 */
export function isStageDelayDisabled(): boolean {
  return (
    process.env.PIPELINE_STAGE_DELAY === "0" ||
    process.env.VITEST === "true" ||
    process.env.NODE_ENV === "test"
  );
}

/**
 * Resolves the inclusive min/max delay band for a pipeline stage.
 */
export function stageDelayRange(name: PipelineStageName): {
  min: number;
  max: number;
} {
  return STAGE_DELAY_MS[name];
}

/**
 * Sleeps for a fixed number of milliseconds.
 */
export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

/**
 * Sleeps for a random duration between minMs and maxMs (inclusive).
 */
export async function sleepRandomMs(
  minMs: number,
  maxMs: number,
): Promise<number> {
  const low = Math.min(minMs, maxMs);
  const high = Math.max(minMs, maxMs);
  const duration = Math.floor(low + Math.random() * (high - low + 1));
  await sleepMs(duration);
  return duration;
}

/**
 * Pads elapsed work time so the stage feels like ~3–10s of agent work.
 * Returns total elapsed ms from `startedAt` (work + padding).
 */
export async function ensureStageFeel(
  name: PipelineStageName,
  startedAt: number,
): Promise<number> {
  if (isStageDelayDisabled()) {
    return Math.max(0, Date.now() - startedAt);
  }

  const { min, max } = stageDelayRange(name);
  const target = Math.floor(min + Math.random() * (max - min + 1));
  const elapsed = Date.now() - startedAt;
  const remaining = target - elapsed;

  if (remaining > 0) {
    await sleepMs(remaining);
  }

  return Math.max(elapsed, target);
}
