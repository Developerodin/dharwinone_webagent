import { OAuth2Client } from "google-auth-library";
import { authEnv } from "../config/env.js";
import { badRequest } from "../lib/httpError.js";

/**
 * Google Identity Services ID-token verification.
 *
 * The client obtains an ID token from Google in a popup and posts it here. That
 * token is only trustworthy if every claim is checked — signature alone proves
 * Google issued it, not that Google issued it *to us, just now, for this
 * sign-in attempt*.
 */

/** Google's two accepted issuer spellings. */
const VALID_ISSUERS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);

let client: OAuth2Client | null = null;

/**
 * Lazily builds the verifier client.
 */
function googleClient(): OAuth2Client {
  const env = authEnv();
  if (!env.googleClientId) {
    throw badRequest(
      "GOOGLE_NOT_CONFIGURED",
      "Google sign-in is not configured on this server.",
    );
  }
  client ??= new OAuth2Client(env.googleClientId);
  return client;
}

export type GoogleIdentity = {
  /** Google's stable subject id. The only safe join key. */
  providerUserId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

/**
 * Verifies a Google ID token and returns the identity it asserts.
 *
 * Checks performed, and why each matters:
 *  - signature + `aud`  : the token was minted by Google *for our client id*,
 *                         not for some other app whose token was replayed here
 *  - `iss`              : issued by Google's identity service
 *  - `exp`              : enforced by the library; re-checked defensively
 *  - `nonce`            : ties the token to the sign-in attempt we started,
 *                         so a captured token cannot be replayed later
 *  - `email_verified`   : without it, anyone able to mint a Google account
 *                         claiming a victim's address could take over the
 *                         matching ProwPlus account through account linking
 */
export async function verifyGoogleIdToken(
  credential: string,
  expectedNonce: string,
): Promise<GoogleIdentity> {
  const env = authEnv();

  let payload;
  try {
    const ticket = await googleClient().verifyIdToken({
      idToken: credential,
      audience: env.googleClientId!,
    });
    payload = ticket.getPayload();
  } catch {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google sign-in failed. Please try again.");
  }

  if (!payload) {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google sign-in failed. Please try again.");
  }

  if (!VALID_ISSUERS.has(payload.iss)) {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google sign-in failed. Please try again.");
  }

  if (payload.aud !== env.googleClientId) {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google sign-in failed. Please try again.");
  }

  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google sign-in expired. Please try again.");
  }

  if (!payload.nonce || payload.nonce !== expectedNonce) {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google sign-in failed. Please try again.");
  }

  if (!payload.email) {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google did not return an email address.");
  }

  if (payload.email_verified !== true) {
    throw badRequest(
      "GOOGLE_EMAIL_UNVERIFIED",
      "That Google account does not have a verified email address.",
    );
  }

  if (!payload.sub) {
    throw badRequest("GOOGLE_TOKEN_INVALID", "Google sign-in failed. Please try again.");
  }

  return {
    providerUserId: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null,
  };
}
