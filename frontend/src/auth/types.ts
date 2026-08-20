/** Server-provided user shape. Mirrors backend `AuthUser`. */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  providers: Array<"password" | "google">;
  onboarding: {
    complete: boolean;
    currentStep: number;
    themePref: "light" | "dark" | null;
    fullName: string | null;
    role: string | null;
    companySize: string | null;
  };
};

/** Payload returned by every endpoint that establishes a session. */
export type AuthSuccess = {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
  isNewUser?: boolean;
};

/** Returned when the server wants the client to go verify an email first. */
export type VerifyRequired = {
  next: "verify_email";
  email: string;
  maskedEmail: string;
  emailDelayed?: boolean;
};

/** Stable error codes. Switch on these, never on message text. */
export type AuthErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "EMAIL_NOT_VERIFIED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_MAX_ATTEMPTS"
  | "RATE_LIMITED"
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
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

/**
 * An error carrying the server's stable code plus any structured detail
 * (retry countdowns, remaining attempts) the UI needs to render.
 */
export class ApiError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: AuthErrorCode,
    message: string,
    status: number,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Seconds the UI should count down before re-enabling an action. */
  get retryAfterSec(): number | null {
    const value = this.details.retryAfterSec;
    return typeof value === "number" ? value : null;
  }

  /** Attempts left on an OTP, when the server reported one. */
  get attemptsRemaining(): number | null {
    const value = this.details.attemptsRemaining;
    return typeof value === "number" ? value : null;
  }
}
