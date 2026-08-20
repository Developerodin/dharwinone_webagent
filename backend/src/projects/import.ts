import { LIMITS } from "../config/limits.js";
import { prisma } from "../db/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import { badRequest } from "../lib/httpError.js";
import { replaceMessages } from "./messages.js";
import {
  extractAssetPaths,
  resolveProjectName,
  validatePage,
} from "./pageGuards.js";
import { linkPageAssets } from "../assets/links.js";
import { nextAvailableSlug, slugify } from "./slug.js";

/**
 * Imports projects out of a browser's localStorage.
 *
 * Anyone could build a site before accounts existed, and that work lives on one
 * device in `prowplus-projects`. Signing up must not discard it, so the client
 * hands the blob over once and the server takes ownership.
 *
 * Failures are per-project and reported, never fatal: one corrupt entry from an
 * old schema version must not block the other eleven.
 */

/** Matches the client's StoredProject shape, all fields untrusted. */
type IncomingProject = {
  id?: unknown;
  businessName?: unknown;
  pageFamily?: unknown;
  messages?: unknown;
  phase?: unknown;
  brief?: unknown;
  page?: unknown;
  enrichedChatText?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  direction?: unknown;
  history?: unknown;
};

export type ImportOutcome = {
  localId: string;
  status: "imported" | "skipped" | "failed";
  projectId?: string;
  versions?: number;
  reason?: string;
};

/** Most localStorage buckets hold a handful; the cap is a sanity bound. */
const MAX_PROJECTS = 30;

/** History entries replayed as earlier versions, newest-last. */
const MAX_HISTORY = 20;

/**
 * Reads a string field, or returns a fallback.
 */
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Normalizes the client's chat messages for storage.
 */
function toMessages(raw: unknown): Array<{
  role: string;
  content: string;
  payload?: unknown;
}> {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => {
      const { role, content, id, timestamp, ...payload } = item;
      return {
        role: ["user", "assistant", "agent"].includes(str(role))
          ? str(role)
          : "assistant",
        content: str(content).slice(0, 20000),
        payload: Object.keys(payload).length > 0 ? payload : undefined,
      };
    })
    .slice(-LIMITS.maxMessagesPerProject);
}

/**
 * Imports one project inside a transaction.
 */
async function importOne(
  tx: Prisma.TransactionClient,
  userId: string,
  incoming: IncomingProject,
  takenSlugs: Set<string>,
): Promise<ImportOutcome> {
  const localId = str(incoming.id);

  if (!localId) {
    return { localId: "(missing id)", status: "failed", reason: "no id" };
  }

  // Signing in on a second device re-sends the same bucket. The unique
  // (ownerId, sourceLocalId) makes that a no-op instead of a duplicate.
  const existing = await tx.project.findFirst({
    where: { ownerId: userId, sourceLocalId: localId },
    select: { id: true },
  });

  if (existing) {
    return { localId, status: "skipped", projectId: existing.id, reason: "already imported" };
  }

  const name =
    str(incoming.businessName) ||
    resolveProjectName(incoming.brief, incoming.page);
  const base = slugify(name);
  const slug = nextAvailableSlug(base, takenSlugs);
  takenSlugs.add(slug);

  const pageFamily = str(incoming.pageFamily, "premium");
  const createdAt =
    typeof incoming.createdAt === "number"
      ? new Date(incoming.createdAt)
      : new Date();

  const project = await tx.project.create({
    data: {
      ownerId: userId,
      sourceLocalId: localId,
      name,
      slug,
      pageFamily,
      phase: str(incoming.phase, "idle"),
      enrichedChatText: str(incoming.enrichedChatText).slice(0, 100000),
      brief: (incoming.brief ?? undefined) as Prisma.InputJsonValue | undefined,
      direction: (incoming.direction ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      createdAt,
      events: {
        create: { userId, type: "imported", meta: { localId } },
      },
    },
  });

  // History oldest-first, then the current page last, so the version chain
  // reads the same way it did in the browser and undo still means something.
  const history = Array.isArray(incoming.history)
    ? (incoming.history as Array<Record<string, unknown>>).slice(-MAX_HISTORY)
    : [];

  const snapshots = [
    ...history.map((entry) => ({
      page: entry.page,
      brief: entry.brief,
      direction: entry.direction,
      family: str(entry.family, pageFamily),
      summary: str(entry.summary, "Imported change"),
    })),
    ...(incoming.page
      ? [
          {
            page: incoming.page,
            brief: incoming.brief,
            direction: incoming.direction,
            family: pageFamily,
            summary: "Imported from this browser",
          },
        ]
      : []),
  ];

  let version = 0;
  // Annotated explicitly: it is read inside the same create() call that
  // produces its next value, which TypeScript cannot infer on its own.
  let previousVersionId: string | null = null;

  for (const snapshot of snapshots) {
    let validated;
    try {
      validated = validatePage(snapshot.page);
    } catch {
      // A history entry from an older page schema is not worth failing the
      // whole project over; skip it and keep the ones that still parse.
      continue;
    }

    version += 1;
    const created: { id: string } = await tx.projectVersion.create({
      select: { id: true },
      data: {
        projectId: project.id,
        version,
        page: validated.page as unknown as Prisma.InputJsonValue,
        brief: (snapshot.brief ?? undefined) as Prisma.InputJsonValue | undefined,
        direction: (snapshot.direction ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        pageFamily: snapshot.family,
        source: "IMPORT",
        summary: snapshot.summary.slice(0, 280),
        authorId: userId,
        parentVersionId: previousVersionId,
        sizeBytes: validated.sizeBytes,
      },
    });

    previousVersionId = created.id;
    await linkPageAssets(
      tx,
      project.id,
      userId,
      extractAssetPaths(validated.page),
    );
  }

  if (version > 0) {
    await tx.project.update({
      where: { id: project.id },
      data: { currentVersionId: previousVersionId, currentVersion: version },
    });
  }

  const messages = toMessages(incoming.messages);
  await replaceMessages(tx, project.id, messages);

  return {
    localId,
    status: "imported",
    projectId: project.id,
    versions: version,
    // Worth saying out loud: the project came across with its chat and brief
    // but no readable page, so the user will need to rebuild it.
    ...(version === 0 && snapshots.length > 0
      ? { reason: "page could not be read - chat and brief imported, rebuild needed" }
      : {}),
  };
}

export type ImportResult = {
  imported: number;
  skipped: number;
  failed: number;
  results: ImportOutcome[];
};

/**
 * Imports a batch of projects from the client.
 */
export async function importProjects(
  userId: string,
  incoming: unknown,
): Promise<ImportResult> {
  if (!Array.isArray(incoming)) {
    throw badRequest("VALIDATION_ERROR", "projects must be an array.");
  }

  if (incoming.length > MAX_PROJECTS) {
    throw badRequest(
      "VALIDATION_ERROR",
      `Too many projects to import at once (limit ${MAX_PROJECTS}).`,
    );
  }

  const owned = await prisma.project.count({
    where: { ownerId: userId, deletedAt: null },
  });
  const room = Math.max(LIMITS.maxProjectsPerUser - owned, 0);

  const existingSlugs = await prisma.project.findMany({
    where: { ownerId: userId },
    select: { slug: true },
  });
  const takenSlugs = new Set(existingSlugs.map((row) => row.slug));

  const results: ImportOutcome[] = [];

  for (const [index, raw] of incoming.entries()) {
    if (index >= room) {
      results.push({
        localId: str((raw as IncomingProject)?.id, `#${index}`),
        status: "failed",
        reason: "project limit reached",
      });
      continue;
    }

    try {
      // One transaction per project: a failure rolls back only that project,
      // leaving the ones that already succeeded intact.
      results.push(
        await prisma.$transaction((tx) =>
          importOne(tx, userId, raw as IncomingProject, takenSlugs),
        ),
      );
    } catch (error) {
      results.push({
        localId: str((raw as IncomingProject)?.id, `#${index}`),
        status: "failed",
        reason: error instanceof Error ? error.message.slice(0, 200) : "unknown",
      });
    }
  }

  return {
    imported: results.filter((r) => r.status === "imported").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}
