import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/client.js";
import { conflict, unprocessable } from "../lib/httpError.js";

/**
 * Replay protection for mutating requests.
 *
 * The auth layer refreshes an expired token and replays the original request
 * automatically. Without a dedupe key that retry runs the handler twice — which
 * for a build means paying OpenAI twice and appending two versions. This
 * middleware makes a retry free.
 *
 * The key is optional: routes that are naturally idempotent do not need one,
 * and a client that omits it simply gets the old behaviour.
 */

const HEADER = "idempotency-key";

/** How long a completed response stays replayable. */
const RETENTION_HOURS = 24;

/**
 * Hashes the request body so a reused key with different content is caught.
 */
function hashBody(body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(body ?? null))
    .digest("hex");
}

/**
 * Wraps a route so identical retries return the first response.
 */
export function idempotent(routeName: string) {
  return async function middleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const key = req.headers[HEADER];
    const userId = req.auth?.sub;

    if (typeof key !== "string" || !key.trim() || !userId) {
      next();
      return;
    }

    const scopedKey = `${userId}:${routeName}:${key.trim()}`;
    const requestHash = hashBody(req.body);

    // Reserving via insert makes the check atomic: two concurrent retries
    // cannot both find "no record" and both proceed to run the handler.
    //
    // createMany + skipDuplicates rather than create-and-catch: a replayed
    // request is normal operation, and letting it raise a unique-constraint
    // violation means the database driver logs an error every single time.
    // A log full of expected errors teaches people to ignore errors.
    const reserved = await prisma.idempotencyRecord.createMany({
      data: [
        {
          key: scopedKey,
          userId,
          route: routeName,
          requestHash,
          status: 0,
          response: {},
        },
      ],
      skipDuplicates: true,
    });

    if (reserved.count === 0) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key: scopedKey },
      });

      if (!existing) {
        // Reserved by someone else and already swept; proceeding un-deduped is
        // safer than failing a request the user is waiting on.
        next();
        return;
      }

      if (existing.requestHash !== requestHash) {
        next(
          unprocessable(
            "IDEMPOTENCY_KEY_REUSED",
            "That request key was already used with different content.",
          ),
        );
        return;
      }

      if (!existing.completedAt) {
        next(
          conflict(
            "REQUEST_IN_FLIGHT",
            "That request is already being processed.",
            { retryAfterSec: 2 },
          ),
        );
        return;
      }

      // A streamed original stored no body. Replaying an empty response would
      // look like success with no result, so re-run instead — the caller is
      // retrying something that already completed, and re-running is the
      // honest outcome even though it costs tokens again.
      const hasBody =
        existing.response !== null &&
        typeof existing.response === "object" &&
        Object.keys(existing.response as object).length > 0;

      if (!hasBody) {
        await prisma.idempotencyRecord.delete({ where: { key: scopedKey } });
        next();
        return;
      }

      res.status(existing.status).json(existing.response);
      return;
    }

    // Capture the response so the next retry can replay it verbatim.
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      void prisma.idempotencyRecord
        .update({
          where: { key: scopedKey },
          data: {
            status: res.statusCode,
            response: body as object,
            completedAt: new Date(),
          },
        })
        .catch(() => {
          // Losing the cache entry only costs us dedupe on a later retry.
        });

      return originalJson(body);
    };

    // Finalize on connection close, covering two cases res.json() misses:
    //
    //  - a failed handler must release the key, or a legitimate retry of a
    //    transient failure is rejected as "already in flight" for 24 hours
    //  - a streamed response (SSE build) never calls res.json at all, so
    //    without this the key stays permanently reserved and the user cannot
    //    retry that build for a day
    res.on("finish", () => {
      if (res.statusCode >= 500) {
        void prisma.idempotencyRecord
          .delete({ where: { key: scopedKey } })
          .catch(() => {});
        return;
      }

      // Mark complete only if res.json did not already do it. A streamed body
      // cannot be replayed, so the stored response stays empty and a retry
      // re-runs rather than returning a truncated cache hit.
      void prisma.idempotencyRecord
        .updateMany({
          where: { key: scopedKey, completedAt: null },
          data: { status: res.statusCode, completedAt: new Date() },
        })
        .catch(() => {});
    });

    next();
  };
}

/**
 * Deletes expired idempotency records. Run on a schedule.
 */
export async function pruneIdempotencyRecords(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
  const result = await prisma.idempotencyRecord.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
