import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../lib/httpError.js";
import { isSessionLive } from "../auth/sessions.js";
import { verifyAccessToken, type AccessTokenPayload } from "../auth/tokens.js";

/**
 * Bearer-token authentication.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by requireAuth / optionalAuth. */
      auth?: AccessTokenPayload;
    }
  }
}

/**
 * Extracts a bearer token from the Authorization header.
 */
function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Rejects the request unless it carries a valid access token whose session is
 * still live.
 *
 * The session check is what makes "sign out everywhere" immediate. Verifying
 * only the JWT signature would leave a revoked device working until its token
 * happened to expire — up to fifteen minutes of access after a password reset.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readBearer(req);
    if (!token) {
      throw unauthorized("SESSION_EXPIRED", "Sign in to continue.");
    }

    const claims = verifyAccessToken(token);

    if (!(await isSessionLive(claims.sid))) {
      throw unauthorized("SESSION_EXPIRED", "Your session has ended.");
    }

    req.auth = claims;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Requires a verified email address in addition to a live session.
 */
export function requireVerified(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    next(unauthorized("SESSION_EXPIRED", "Sign in to continue."));
    return;
  }
  if (!req.auth.ev) {
    next(
      unauthorized("EMAIL_NOT_VERIFIED", "Please verify your email address."),
    );
    return;
  }
  next();
}

/**
 * Attaches auth when present but never rejects.
 *
 * Used by endpoints that behave differently for signed-in users without
 * requiring an account.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readBearer(req);
  if (!token) {
    next();
    return;
  }
  try {
    const claims = verifyAccessToken(token);
    if (await isSessionLive(claims.sid)) {
      req.auth = claims;
    }
  } catch {
    // An invalid token on an optional route is simply "not signed in".
  }
  next();
}
