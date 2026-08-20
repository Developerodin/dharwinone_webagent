import type { Response } from "express";
import { authEnv } from "../config/env.js";

/** Cookie name for the opaque refresh token. */
export const REFRESH_COOKIE = "prow_rt";

/**
 * Path scope for the refresh cookie.
 *
 * Scoping to /api/auth means the cookie is not attached to build, edit, upload
 * or any other request — it travels only on the handful of endpoints that
 * actually need it, which shrinks both the CSRF surface and request size.
 */
const COOKIE_PATH = "/api/auth";

/**
 * Sets the refresh cookie.
 *
 * SameSite=Lax blocks cross-site POSTs from carrying it, which combined with
 * refresh being POST-only is sufficient CSRF protection for this endpoint.
 * Secure is conditional so local http://localhost development still works.
 */
export function setRefreshCookie(
  res: Response,
  token: string,
  expiresAt: Date,
): void {
  const env = authEnv();
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: COOKIE_PATH,
    domain: env.cookieDomain,
    expires: expiresAt,
  });
}

/**
 * Clears the refresh cookie.
 *
 * The attributes must match those used when setting it or the browser will
 * keep the original cookie alongside the expired one.
 */
export function clearRefreshCookie(res: Response): void {
  const env = authEnv();
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: COOKIE_PATH,
    domain: env.cookieDomain,
  });
}
