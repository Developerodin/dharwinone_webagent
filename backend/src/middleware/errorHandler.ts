import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";

type BodyParserError = Error & { type: string; status?: number };

/**
 * Detects an error thrown by express.json().
 *
 * body-parser tags its errors with a `type` such as `entity.too.large` or
 * `entity.parse.failed`, which is the only reliable way to tell them apart
 * from genuine server faults.
 */
function isBodyParserError(error: unknown): error is BodyParserError {
  return (
    error instanceof Error &&
    "type" in error &&
    typeof (error as BodyParserError).type === "string" &&
    (error as BodyParserError).type.startsWith("entity.")
  );
}

/**
 * Terminal error handler for the auth surface.
 *
 * Produces one envelope shape for every failure so the client can switch on
 * `error.code` without special-casing transport-level errors.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    if (error.code === "RATE_LIMITED") {
      const retryAfter = error.details?.retryAfterSec;
      if (typeof retryAfter === "number") {
        res.setHeader("Retry-After", String(retryAfter));
      }
    }
    res.status(error.status).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the details you entered.",
        details: {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
    });
    return;
  }

  // body-parser failures are client mistakes, not server bugs. Left to the
  // generic branch they would return 500 and page someone every time a script
  // posts malformed JSON or an oversized body.
  if (isBodyParserError(error)) {
    const tooLarge = error.type === "entity.too.large";
    res.status(tooLarge ? 413 : 400).json({
      ok: false,
      error: {
        code: tooLarge ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR",
        message: tooLarge
          ? "That request was too large."
          : "Malformed request body.",
      },
    });
    return;
  }

  // Anything reaching here is a bug. Log it with detail, tell the client
  // nothing — stack traces and driver messages leak schema and file paths.
  console.error("[auth] unhandled error:", error);
  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    },
  });
}
