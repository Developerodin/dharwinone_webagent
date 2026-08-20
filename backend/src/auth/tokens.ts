import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { authEnv } from "../config/env.js";
import { unauthorized } from "../lib/httpError.js";

const ISSUER = "prowplus";
const AUDIENCE = "prowplus-web";

/** Claims carried by a short-lived access token. */
export type AccessClaims = {
  /** User id. */
  sub: string;
  /** Session id — lets us revoke a specific device. */
  sid: string;
  email: string;
  /** Email verified. Denormalized so the client can route without a fetch. */
  ev: boolean;
  /** Onboarding complete. Same reasoning as `ev`. */
  ob: boolean;
};

export type AccessTokenPayload = AccessClaims & {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

/**
 * Signs a 15-minute access token.
 *
 * `ev`/`ob` are denormalized into the token so the SPA can pick a route on the
 * first paint. They can be at most one token-lifetime stale, which is why
 * completing onboarding issues a fresh token rather than waiting for expiry.
 */
export function signAccessToken(claims: AccessClaims): string {
  const env = authEnv();
  return jwt.sign(claims, env.accessSecret, {
    algorithm: "HS256",
    expiresIn: env.accessTtlSeconds,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/**
 * Verifies an access token, throwing SESSION_EXPIRED when it is not usable.
 *
 * Algorithm is pinned to HS256: without it, a token with `"alg": "none"` (or an
 * RS256 token verified against our secret as a public key) would be accepted.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const env = authEnv();
  try {
    return jwt.verify(token, env.accessSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as AccessTokenPayload;
  } catch {
    throw unauthorized("SESSION_EXPIRED", "Your session has expired.");
  }
}

/** Claims carried by a single-use password-reset ticket. */
export type ResetTicketClaims = {
  sub: string;
  jti: string;
  purpose: "reset";
};

/** How long a reset ticket stays valid once the OTP has been verified. */
const RESET_TICKET_TTL_SECONDS = 10 * 60;

/**
 * Mints a 10-minute password-reset ticket.
 *
 * Signed with a secret distinct from the access-token secret so a reset ticket
 * can never be replayed as an access token. The returned `jti` is recorded in
 * the database and burned on use, making the ticket single-use.
 */
export function mintResetTicket(userId: string): {
  ticket: string;
  jti: string;
  expiresAt: Date;
} {
  const env = authEnv();
  const jti = randomUUID();
  const ticket = jwt.sign({ sub: userId, jti, purpose: "reset" }, env.resetSecret, {
    algorithm: "HS256",
    expiresIn: RESET_TICKET_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return {
    ticket,
    jti,
    expiresAt: new Date(Date.now() + RESET_TICKET_TTL_SECONDS * 1000),
  };
}

/**
 * Verifies a reset ticket's signature and shape.
 *
 * Single-use enforcement lives in the database (ResetTicket.consumedAt); this
 * only proves the ticket is authentic and unexpired.
 */
export function verifyResetTicket(ticket: string): ResetTicketClaims {
  const env = authEnv();
  try {
    const payload = jwt.verify(ticket, env.resetSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as ResetTicketClaims;

    if (payload.purpose !== "reset") {
      throw new Error("wrong purpose");
    }
    return payload;
  } catch {
    throw unauthorized(
      "RESET_TICKET_INVALID",
      "This reset link has expired. Please request a new code.",
    );
  }
}
