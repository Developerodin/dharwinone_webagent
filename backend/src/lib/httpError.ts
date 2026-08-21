/**
 * Application errors with stable, machine-readable codes.
 *
 * The client switches on `code`, never on message text, so messages can be
 * reworded freely without breaking behaviour. Every code that reaches a client
 * is listed here — if it is not in this union, it is a bug, not a case the UI
 * is expected to handle.
 */
export type ErrorCode =
  // Shared
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  // Auth
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "EMAIL_NOT_VERIFIED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_MAX_ATTEMPTS"
  | "ACCOUNT_LOCKED"
  | "WEAK_PASSWORD"
  | "SESSION_EXPIRED"
  | "SESSION_REUSED"
  | "GOOGLE_TOKEN_INVALID"
  | "GOOGLE_EMAIL_UNVERIFIED"
  | "GOOGLE_NOT_CONFIGURED"
  | "PASSWORD_ALREADY_SET"
  | "RESET_TICKET_INVALID"
  | "PASSWORD_REUSED"
  | "INVITE_REQUIRED"
  // Projects and assets
  | "PROJECT_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "VERSION_CONFLICT"
  | "PAGE_TOO_LARGE"
  | "DATA_URL_REJECTED"
  | "INVALID_PAGE"
  | "INVALID_ASSET_REFERENCE"
  | "SECTION_NOT_FOUND"
  | "JOB_NOT_FOUND"
  | "QUOTA_EXCEEDED"
  | "ASSET_NOT_READY"
  | "ASSET_NOT_FOUND"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "STORAGE_UNAVAILABLE"
  | "IDEMPOTENCY_KEY_REUSED"
  | "REQUEST_IN_FLIGHT";

/** Structured context the UI needs to render a specific message. */
export type ErrorDetails = Record<string, unknown>;

/**
 * An error carrying an HTTP status and a stable client-facing code.
 */
export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** 400 — the request was understood but is not acceptable. */
export function badRequest(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): HttpError {
  return new HttpError(code, message, 400, details);
}

/** 401 — not authenticated, or the credentials were wrong. */
export function unauthorized(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): HttpError {
  return new HttpError(code, message, 401, details);
}

/** 403 — authenticated, but not allowed. */
export function forbidden(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): HttpError {
  return new HttpError(code, message, 403, details);
}

/**
 * 404 — no such resource, or none this caller may see.
 *
 * Used for another user's project too: a 403 would confirm the id exists,
 * which is exactly the fact we are withholding.
 */
export function notFound(
  code: ErrorCode = "NOT_FOUND",
  message = "Not found.",
  details?: ErrorDetails,
): HttpError {
  return new HttpError(code, message, 404, details);
}

/** 409 — the request conflicts with current state (optimistic concurrency). */
export function conflict(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): HttpError {
  return new HttpError(code, message, 409, details);
}

/** 413 — the body exceeds the route's limit. */
export function payloadTooLarge(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): HttpError {
  return new HttpError(code, message, 413, details);
}

/** 422 — well-formed, but semantically unprocessable. */
export function unprocessable(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): HttpError {
  return new HttpError(code, message, 422, details);
}

/** 429 — rate limited; `retryAfterSec` is what the UI counts down. */
export function rateLimited(message: string, retryAfterSec: number): HttpError {
  return new HttpError("RATE_LIMITED", message, 429, { retryAfterSec });
}
