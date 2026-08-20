import { ApiError, type AuthErrorCode } from "@/auth/types";

/**
 * The single HTTP client for the app.
 *
 * Owns three things nothing else should duplicate:
 *  - attaching the in-memory access token
 *  - refreshing exactly once when a call 401s, and replaying the original
 *  - telling the app when the session is genuinely gone
 */

/**
 * The access token lives in this module's closure — not localStorage, not a
 * cookie readable by script. A page reload loses it, which is intentional: it
 * is recovered from the httpOnly refresh cookie by `bootstrapSession()`.
 */
let accessToken: string | null = null;

/** Called when refresh fails and the user must sign in again. */
let onSessionLost: (() => void) | null = null;

/** Endpoints that must never trigger a refresh attempt. */
const NO_REFRESH = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/google",
  "/api/auth/verify-email",
  "/api/auth/forgot-password",
  "/api/auth/verify-reset-otp",
  "/api/auth/reset-password",
];

/**
 * Stores the current access token.
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Reads the current access token. Exported for the rare caller that needs it
 * directly (e.g. an EventSource that cannot set headers).
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Registers the callback fired when the session cannot be recovered.
 */
export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler;
}

/**
 * In-flight refresh, shared by every caller.
 *
 * Ten parallel requests that all 401 must produce one refresh, not ten. The
 * promise is stored so latecomers await the same call, and cleared in `finally`
 * so the next genuine expiry starts a fresh one.
 */
let refreshing: Promise<string | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token.
 */
async function doRefresh(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      // Forces a CORS preflight for any cross-origin caller, which SameSite=Lax
      // already blocks — a second, independent barrier against CSRF.
      headers: { "X-Requested-With": "prowplus" },
    });

    if (!response.ok) return null;

    const body = await response.json();
    const token = body?.data?.accessToken;
    if (typeof token !== "string") return null;

    accessToken = token;
    return token;
  } catch {
    return null;
  }
}

/**
 * Returns a fresh access token, coalescing concurrent callers.
 */
async function refreshOnce(): Promise<string | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Parses an error response into an ApiError.
 */
async function toApiError(response: Response): Promise<ApiError> {
  let code: AuthErrorCode = "INTERNAL_ERROR";
  let message = "Something went wrong. Please try again.";
  let details: Record<string, unknown> = {};

  try {
    const body = await response.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details ?? {};
    }
  } catch {
    // A non-JSON error body (proxy timeout, HTML error page) keeps the defaults.
  }

  return new ApiError(code, message, response.status, details);
}

export type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Skip the bearer header — used by the public auth endpoints. */
  anonymous?: boolean;
  signal?: AbortSignal;
  /**
   * Dedupe key for a mutating request.
   *
   * Required on anything expensive or non-repeatable: the 401-refresh-and-retry
   * below replays the original request, and without a key that retry would run
   * an LLM build twice and bill twice.
   */
  idempotencyKey?: string;
};

/**
 * Performs an API request, refreshing and replaying once on 401.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    anonymous = false,
    signal,
    idempotencyKey,
  } = options;

  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      "X-Requested-With": "prowplus",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token && !anonymous) headers.Authorization = `Bearer ${token}`;
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    return fetch(path, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  };

  let response: Response;
  try {
    response = await send(accessToken);
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "Can't reach the server. Check your connection.",
      0,
    );
  }

  const refreshable =
    response.status === 401 &&
    !anonymous &&
    !NO_REFRESH.some((prefix) => path.startsWith(prefix));

  if (refreshable) {
    const token = await refreshOnce();

    if (!token) {
      accessToken = null;
      onSessionLost?.();
      throw await toApiError(response);
    }

    // Exactly one replay. A second 401 means the session is genuinely dead,
    // and retrying again would loop.
    response = await send(token);

    if (response.status === 401) {
      accessToken = null;
      onSessionLost?.();
      throw await toApiError(response);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

/**
 * Recovers a session on app boot using only the httpOnly refresh cookie.
 *
 * Returns null when there is no valid cookie, which is the normal signed-out
 * case and must not be treated as an error.
 */
export async function bootstrapSession(): Promise<{
  accessToken: string;
  user: unknown;
} | null> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "prowplus" },
    });

    if (!response.ok) return null;

    const body = await response.json();
    if (typeof body?.data?.accessToken !== "string") return null;

    accessToken = body.data.accessToken;
    return body.data;
  } catch {
    return null;
  }
}
