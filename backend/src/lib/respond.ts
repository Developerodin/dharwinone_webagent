import type { Response } from "express";

/**
 * The single success envelope: `{ ok: true, data, meta? }`.
 *
 * One shape for every endpoint means the client's error and pagination
 * handling lives in one place rather than being re-derived per call site.
 */
export function ok(
  res: Response,
  data: unknown,
  status = 200,
  meta?: Record<string, unknown>,
): void {
  // Authenticated responses carry identity and must never sit in a shared or
  // back-button cache. Routes that want caching set their own header after
  // this one — Express keeps the last write.
  if (!res.hasHeader("Cache-Control")) {
    res.setHeader("Cache-Control", "no-store");
  }

  res.status(status).json({
    ok: true,
    data,
    ...(meta ? { meta } : {}),
  });
}
