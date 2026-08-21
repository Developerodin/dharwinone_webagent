import { prisma } from "../db/client.js";
import type { BuildJob, Prisma } from "../generated/prisma/client.js";
import { notFound } from "../lib/httpError.js";

/**
 * Durable build jobs.
 *
 * A build takes tens of seconds and costs real tokens, so it cannot live only
 * in the request that started it. Every build writes a row here as it goes:
 * the stages it has emitted, the version it produced, and a heartbeat. A
 * client that reloaded, lost its connection, or moved to another device
 * reattaches to the row rather than watching a spinner that will never finish.
 */

/**
 * A build with no heartbeat for this long is not running any more.
 *
 * Comfortably longer than the slowest stage, so a legitimately slow pipeline is
 * never declared dead while it is still working.
 */
const STALE_AFTER_MS = 5 * 60 * 1000;

/** One stage event as the client renders it. */
export type JobStage = {
  name: string;
  status: string;
  message?: string;
  detail?: string;
  ms?: number;
};

/**
 * Reads the stage list off a job row.
 *
 * Stored as JSON, so it has to be narrowed rather than trusted — a row written
 * by an older build must not crash the reader.
 */
export function jobStages(job: Pick<BuildJob, "stages">): JobStage[] {
  return Array.isArray(job.stages) ? (job.stages as JobStage[]) : [];
}

/**
 * Opens a build job in the RUNNING state.
 */
export async function startJob(args: {
  userId: string;
  projectId: string;
  chatText?: string | null;
  pageFamily?: string | null;
}): Promise<BuildJob> {
  return prisma.buildJob.create({
    data: {
      userId: args.userId,
      projectId: args.projectId,
      status: "RUNNING",
      chatText: args.chatText ?? null,
      pageFamily: args.pageFamily ?? null,
    },
  });
}

/**
 * Serializes stage writes per job.
 *
 * Recording a stage is a read-modify-write on a JSON column, and the pipeline
 * fires them without awaiting. Two overlapping writes would both read the same
 * array and the second would erase the first — the classic lost update, and it
 * would show up as a stage silently missing from a resumed build.
 */
const stageWrites = new Map<string, Promise<void>>();

/**
 * Appends a stage event and bumps the heartbeat.
 *
 * Failures are swallowed: progress reporting must never be the thing that
 * kills a build the user is already paying for.
 */
export async function recordStage(
  jobId: string,
  stage: JobStage,
): Promise<void> {
  const previous = stageWrites.get(jobId) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(() => writeStage(jobId, stage));

  stageWrites.set(jobId, run);
  await run;

  // Drop the chain once it is the last one, so a long-lived process does not
  // accumulate an entry per build it has ever run.
  if (stageWrites.get(jobId) === run) stageWrites.delete(jobId);
}

/**
 * Performs one stage write. Callers go through `recordStage`, which serializes.
 */
async function writeStage(jobId: string, stage: JobStage): Promise<void> {
  try {
    const job = await prisma.buildJob.findUnique({
      where: { id: jobId },
      select: { stages: true },
    });
    if (!job) return;

    const stages = jobStages(job);
    const existing = stages.findIndex((entry) => entry.name === stage.name);

    // Stages are updated in place, not appended twice: a stage goes running →
    // done, and a resumed client should see one row per stage, not two.
    if (existing >= 0) stages[existing] = stage;
    else stages.push(stage);

    await prisma.buildJob.update({
      where: { id: jobId },
      data: {
        stages: stages as unknown as Prisma.InputJsonValue,
        heartbeatAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`[jobs] could not record stage for ${jobId}:`, error);
  }
}

/**
 * Marks a job finished with the version it produced.
 */
export async function completeJob(
  jobId: string,
  result: { version: number; versionId: string },
): Promise<void> {
  try {
    await prisma.buildJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCEEDED",
        version: result.version,
        versionId: result.versionId,
        finishedAt: new Date(),
        heartbeatAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`[jobs] could not complete ${jobId}:`, error);
  }
}

/**
 * Marks a job failed with a user-facing message.
 */
export async function failJob(jobId: string, message: string): Promise<void> {
  try {
    await prisma.buildJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: message.slice(0, 2000),
        finishedAt: new Date(),
        heartbeatAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`[jobs] could not fail ${jobId}:`, error);
  }
}

/**
 * Loads a job the user owns.
 */
export async function requireJob(
  userId: string,
  jobId: string,
): Promise<BuildJob> {
  const job = await prisma.buildJob.findFirst({
    where: { id: jobId, userId },
  });

  if (!job) {
    throw notFound("JOB_NOT_FOUND", "That build could not be found.");
  }

  return job;
}

/**
 * Returns the most recent job for a project, running or not.
 *
 * This is what a reloaded tab asks for: "is something building here, and how
 * far did it get?"
 */
export async function latestJob(
  userId: string,
  projectId: string,
): Promise<BuildJob | null> {
  return prisma.buildJob.findFirst({
    where: { projectId, userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * True when a RUNNING job has stopped reporting progress.
 */
export function isStale(job: Pick<BuildJob, "status" | "heartbeatAt">): boolean {
  return (
    job.status === "RUNNING" &&
    Date.now() - job.heartbeatAt.getTime() > STALE_AFTER_MS
  );
}

/**
 * Fails jobs whose process died.
 *
 * Run at boot and on the maintenance sweep. Without it a crash mid-build
 * leaves a row that claims to be running forever, and every client that
 * reattaches waits on a pipeline nobody is executing.
 */
export async function reconcileStaleJobs(): Promise<number> {
  const result = await prisma.buildJob.updateMany({
    where: {
      status: "RUNNING",
      heartbeatAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
    },
    data: {
      status: "FAILED",
      error: "The build stopped unexpectedly. Please try again.",
      finishedAt: new Date(),
    },
  });

  return result.count;
}
