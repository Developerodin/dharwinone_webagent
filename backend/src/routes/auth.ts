import { Router, type NextFunction, type Request, type Response } from "express";
import { authEnv } from "../config/env.js";
import { prisma } from "../db/client.js";
import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from "../auth/cookies.js";
import { maskEmail, normalizeEmail } from "../auth/email.js";
import {
  HttpError,
  badRequest,
  forbidden,
  rateLimited,
  unauthorized,
} from "../lib/httpError.js";
import {
  buildDuplicateSignupContent,
  buildGoogleOnlyResetContent,
  buildPasswordChangedContent,
  buildResetPasswordContent,
  buildSuspiciousSessionContent,
  buildVerifyEmailContent,
  sendAuthEmail,
} from "../auth/emails.js";
import { verifyGoogleIdToken } from "../auth/google.js";
import {
  clientIp,
  clientUserAgent,
  issueSession,
  padTiming,
} from "../auth/http.js";
import { ok } from "../lib/respond.js";
import { issueOtp, verifyOtp } from "../auth/otp.js";
import { assertPasswordPolicy, hashPassword } from "../auth/passwords.js";
import { LIMITS, rateLimiter } from "../auth/rateLimit.js";
import {
  revokeAllSessions,
  revokeSessionByToken,
  rotateSession,
} from "../auth/sessions.js";
import {
  mintResetTicket,
  signAccessToken,
  verifyResetTicket,
} from "../auth/tokens.js";
import {
  assertNotLocked,
  authUserInclude,
  checkPassword,
  ensureOnboarding,
  findUserByEmail,
  findUserById,
  newUserData,
  recordFailedLogin,
  recordSuccessfulLogin,
  toAuthUser,
} from "../auth/users.js";
import { fakeVerifyPassword } from "../auth/passwords.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  resendOtpSchema,
  resetPasswordSchema,
  setPasswordSchema,
  signupSchema,
  verifyEmailSchema,
  verifyResetOtpSchema,
} from "../schemas/auth.schema.js";

export const authRouter = Router();

/**
 * Wraps an async handler so rejections reach the error middleware.
 *
 * Express 4 does not await handlers; without this a thrown HttpError becomes an
 * unhandled rejection and the client sees a hung socket instead of a 401.
 */
function handle(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/**
 * Applies a rate limit, throwing RATE_LIMITED when exceeded.
 */
async function limit(
  key: string,
  config: { limit: number; windowMs: number },
  message: string,
): Promise<void> {
  const result = await rateLimiter().hit(key, config.limit, config.windowMs);
  if (!result.allowed) {
    throw rateLimited(message, result.retryAfterSec);
  }
}

/**
 * Issues a verification code and mails it.
 *
 * Returns whether delivery succeeded so the caller can hint at a delay rather
 * than failing a signup because SMTP is momentarily unavailable.
 */
async function sendVerificationCode(
  userId: string,
  email: string,
): Promise<boolean> {
  const env = authEnv();
  const { code } = await issueOtp(userId, "verify_email");
  return sendAuthEmail(email, buildVerifyEmailContent(code, env.otpTtlMinutes));
}

/**
 * Notifies a user that their session family was killed by reuse detection.
 */
async function notifySuspiciousSession(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (user) {
    void sendAuthEmail(user.email, buildSuspiciousSessionContent());
  }
}

// ─────────────────────────────────────────────────────────────
// Signup + email verification
// ─────────────────────────────────────────────────────────────

authRouter.post(
  "/signup",
  handle(async (req, res) => {
    const env = authEnv();
    const startedAt = Date.now();
    const body = signupSchema.parse(req.body);

    await limit(
      `signup:ip:${clientIp(req)}`,
      LIMITS.signupPerIp,
      "Too many sign-up attempts. Please try again later.",
    );

    if (env.signupInviteCode && body.inviteCode !== env.signupInviteCode) {
      throw forbidden(
        "INVITE_REQUIRED",
        "ProwPlus is invite-only right now. Please enter a valid invite code.",
      );
    }

    assertPasswordPolicy(body.password, body.email);

    const existing = await findUserByEmail(body.email);

    if (existing?.emailVerifiedAt) {
      // Do not confirm that the address is registered. Tell the real owner
      // instead, and return the same shape an actual signup would.
      void sendAuthEmail(existing.email, buildDuplicateSignupContent());
      await padTiming(startedAt);
      ok(res, {
        next: "verify_email",
        email: normalizeEmail(body.email),
        maskedEmail: maskEmail(body.email),
      });
      return;
    }

    const passwordHash = await hashPassword(body.password);

    const user = existing
      ? // The address was registered but never verified — nobody proved they
        // own it, so letting a new signup take it over is correct, not a leak.
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, name: body.name ?? existing.name },
          include: authUserInclude,
        })
      : await prisma.user.create({
          data: {
            ...newUserData(body.email),
            passwordHash,
            name: body.name ?? null,
          },
          include: authUserInclude,
        });

    await ensureOnboarding(user.id, body.name ?? null);
    const delivered = await sendVerificationCode(user.id, user.email);

    await padTiming(startedAt);
    ok(
      res,
      {
        next: "verify_email",
        email: user.email,
        maskedEmail: maskEmail(user.email),
        emailDelayed: !delivered,
      },
      201,
    );
  }),
);

authRouter.post(
  "/verify-email",
  handle(async (req, res) => {
    const body = verifyEmailSchema.parse(req.body);

    const user = await findUserByEmail(body.email);
    if (!user) {
      // Same code and shape as a wrong OTP: a valid-looking failure here must
      // not distinguish "no such account" from "wrong code".
      throw badRequest("OTP_INVALID", "That code is not correct.");
    }

    await limit(
      `otp:verify:${user.id}`,
      LIMITS.otpVerifyPerAccount,
      "Too many attempts. Please request a new code.",
    );

    if (user.emailVerifiedAt) {
      // Already verified (second tab, double submit). Treat as success.
      const payload = await issueSession(req, res, user);
      ok(res, payload);
      return;
    }

    await verifyOtp(user.id, "verify_email", body.code);

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), lastLoginAt: new Date() },
      include: authUserInclude,
    });

    await ensureOnboarding(verified.id, verified.name);
    const payload = await issueSession(req, res, verified);
    ok(res, payload);
  }),
);

authRouter.post(
  "/resend-otp",
  handle(async (req, res) => {
    const env = authEnv();
    const startedAt = Date.now();
    const body = resendOtpSchema.parse(req.body);

    const user = await findUserByEmail(body.email);

    // Always report the same cooldown, whether or not the account exists.
    if (user) {
      if (body.purpose === "verify_email" && !user.emailVerifiedAt) {
        await sendVerificationCode(user.id, user.email);
      } else if (body.purpose === "reset_password" && user.passwordHash) {
        const { code } = await issueOtp(user.id, "reset_password");
        await sendAuthEmail(
          user.email,
          buildResetPasswordContent(code, env.otpTtlMinutes),
        );
      }
    }

    await padTiming(startedAt);
    ok(res, { retryAfterSec: env.otpResendCooldownSec });
  }),
);

// ─────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────

authRouter.post(
  "/login",
  handle(async (req, res) => {
    const startedAt = Date.now();
    const body = loginSchema.parse(req.body);

    await limit(
      `login:ip:${clientIp(req)}`,
      LIMITS.loginPerIp,
      "Too many sign-in attempts. Please try again later.",
    );

    const user = await findUserByEmail(body.email);

    if (!user) {
      // Burn equivalent CPU so response time cannot reveal that the address is
      // unregistered.
      await fakeVerifyPassword();
      await padTiming(startedAt);
      throw unauthorized(
        "INVALID_CREDENTIALS",
        "That email or password is incorrect.",
      );
    }

    await limit(
      `login:account:${user.id}`,
      LIMITS.loginPerAccount,
      "Too many sign-in attempts. Please try again later.",
    );

    assertNotLocked(user);

    const passwordOk = await checkPassword(user, body.password);

    if (!passwordOk) {
      await recordFailedLogin(user);
      await padTiming(startedAt);

      // A Google-only account has no password to be "incorrect". Return the
      // same code (no enumeration) but flag the provider so the UI can point
      // at the Google button instead of a password reset the user cannot use.
      if (!user.passwordHash) {
        throw unauthorized(
          "INVALID_CREDENTIALS",
          "That email or password is incorrect.",
          { hint: "google_account" },
        );
      }

      throw unauthorized(
        "INVALID_CREDENTIALS",
        "That email or password is incorrect.",
      );
    }

    await rateLimiter().reset(`login:account:${user.id}`);

    if (!user.emailVerifiedAt) {
      // Correct password but unverified: send a fresh code instead of a dead
      // end, so an abandoned signup can always be completed.
      await sendVerificationCode(user.id, user.email);
      ok(res, {
        next: "verify_email",
        email: user.email,
        maskedEmail: maskEmail(user.email),
      });
      return;
    }

    await recordSuccessfulLogin(user.id);
    await ensureOnboarding(user.id, user.name);

    const fresh = (await findUserById(user.id))!;
    const payload = await issueSession(req, res, fresh);
    ok(res, payload);
  }),
);

// ─────────────────────────────────────────────────────────────
// Google
// ─────────────────────────────────────────────────────────────

authRouter.post(
  "/google",
  handle(async (req, res) => {
    const body = googleSchema.parse(req.body);

    await limit(
      `google:ip:${clientIp(req)}`,
      LIMITS.googlePerIp,
      "Too many sign-in attempts. Please try again later.",
    );

    const identity = await verifyGoogleIdToken(body.credential, body.nonce);

    const linked = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: "google",
          providerUserId: identity.providerUserId,
        },
      },
      select: { userId: true },
    });

    let userId: string;
    let isNewUser = false;

    if (linked) {
      userId = linked.userId;
    } else {
      const existing = await findUserByEmail(identity.email);

      if (existing) {
        // Link. Safe only because verifyGoogleIdToken requires email_verified:
        // Google has proved this person controls the mailbox, which is the same
        // proof our own OTP flow demands.
        await prisma.oAuthAccount.create({
          data: {
            userId: existing.id,
            provider: "google",
            providerUserId: identity.providerUserId,
            email: identity.email,
          },
        });
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            name: existing.name ?? identity.name,
            avatarUrl: existing.avatarUrl ?? identity.avatarUrl,
          },
        });
        userId = existing.id;
      } else {
        const created = await prisma.user.create({
          data: {
            ...newUserData(identity.email),
            name: identity.name,
            avatarUrl: identity.avatarUrl,
            // Google verified the address; a second OTP would be theatre.
            emailVerifiedAt: new Date(),
            oauthAccounts: {
              create: {
                provider: "google",
                providerUserId: identity.providerUserId,
                email: identity.email,
              },
            },
          },
        });
        userId = created.id;
        isNewUser = true;
      }
    }

    // Seed the onboarding name from Google so step 2 is a single tap.
    await ensureOnboarding(userId, identity.name);
    await recordSuccessfulLogin(userId);

    const user = (await findUserById(userId))!;
    const payload = await issueSession(req, res, user);
    ok(res, { ...payload, isNewUser });
  }),
);

// ─────────────────────────────────────────────────────────────
// Session lifecycle
// ─────────────────────────────────────────────────────────────

authRouter.post(
  "/refresh",
  handle(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];

    if (typeof raw !== "string" || !raw) {
      clearRefreshCookie(res);
      throw unauthorized("SESSION_EXPIRED", "Please sign in.");
    }

    let rotated;
    try {
      rotated = await rotateSession(raw, {
        userAgent: clientUserAgent(req),
        ip: clientIp(req),
      });
    } catch (error) {
      clearRefreshCookie(res);

      // Reuse detection just signed this person out everywhere. Tell them why —
      // an unexplained forced logout is indistinguishable from a broken app.
      if (error instanceof HttpError && error.code === "SESSION_REUSED") {
        const userId = error.details?.userId;
        if (typeof userId === "string") {
          void notifySuspiciousSession(userId);
        }
      }
      throw error;
    }

    const user = await findUserById(rotated.userId);
    if (!user) {
      clearRefreshCookie(res);
      throw unauthorized("SESSION_EXPIRED", "Please sign in.");
    }

    setRefreshCookie(res, rotated.token, rotated.session.expiresAt);

    const authUser = toAuthUser(user);
    const accessToken = signAccessToken({
      sub: user.id,
      sid: rotated.session.id,
      email: user.email,
      ev: authUser.emailVerified,
      ob: authUser.onboarding.complete,
    });

    ok(res, {
      accessToken,
      expiresIn: authEnv().accessTtlSeconds,
      user: authUser,
    });
  }),
);

authRouter.post(
  "/logout",
  handle(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (typeof raw === "string" && raw) {
      await revokeSessionByToken(raw);
    }
    clearRefreshCookie(res);
    ok(res, { loggedOut: true });
  }),
);

authRouter.post(
  "/logout-all",
  requireAuth,
  handle(async (req, res) => {
    const count = await revokeAllSessions(req.auth!.sub, "logout_all");
    clearRefreshCookie(res);
    ok(res, { loggedOut: true, sessionsRevoked: count });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  handle(async (req, res) => {
    const user = await findUserById(req.auth!.sub);
    if (!user) {
      throw unauthorized("SESSION_EXPIRED", "Please sign in.");
    }
    ok(res, { user: toAuthUser(user) });
  }),
);

// ─────────────────────────────────────────────────────────────
// Password reset
// ─────────────────────────────────────────────────────────────

authRouter.post(
  "/forgot-password",
  handle(async (req, res) => {
    const env = authEnv();
    const startedAt = Date.now();
    const body = forgotPasswordSchema.parse(req.body);

    await limit(
      `forgot:ip:${clientIp(req)}`,
      LIMITS.forgotPerIp,
      "Too many requests. Please try again later.",
    );

    const user = await findUserByEmail(body.email);

    if (user) {
      if (user.passwordHash) {
        try {
          const { code } = await issueOtp(user.id, "reset_password");
          await sendAuthEmail(
            user.email,
            buildResetPasswordContent(code, env.otpTtlMinutes),
          );
        } catch {
          // Cooldown or hourly cap hit. Swallow: surfacing it here would tell
          // an attacker the address is registered.
        }
      } else {
        // Google-only account. Send a route forward instead of a dead end.
        await sendAuthEmail(user.email, buildGoogleOnlyResetContent());
      }
    }

    await padTiming(startedAt);
    ok(res, {
      sent: true,
      maskedEmail: maskEmail(body.email),
      retryAfterSec: env.otpResendCooldownSec,
    });
  }),
);

authRouter.post(
  "/verify-reset-otp",
  handle(async (req, res) => {
    const body = verifyResetOtpSchema.parse(req.body);

    const user = await findUserByEmail(body.email);
    if (!user) {
      throw badRequest("OTP_INVALID", "That code is not correct.");
    }

    await limit(
      `otp:reset:${user.id}`,
      LIMITS.otpVerifyPerAccount,
      "Too many attempts. Please request a new code.",
    );

    await verifyOtp(user.id, "reset_password", body.code);

    const { ticket, jti, expiresAt } = mintResetTicket(user.id);
    await prisma.resetTicket.create({
      data: { jti, userId: user.id, expiresAt },
    });

    ok(res, { resetTicket: ticket, expiresAt: expiresAt.toISOString() });
  }),
);

authRouter.post(
  "/reset-password",
  handle(async (req, res) => {
    const body = resetPasswordSchema.parse(req.body);
    const claims = verifyResetTicket(body.resetTicket);

    const user = await findUserById(claims.sub);
    if (!user) {
      throw unauthorized("RESET_TICKET_INVALID", "This reset is no longer valid.");
    }

    assertPasswordPolicy(body.password, user.email);

    // Burn the ticket. The conditional update is the single-use guard: a second
    // request with the same ticket updates zero rows and is rejected.
    const consumed = await prisma.resetTicket.updateMany({
      where: { jti: claims.jti, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });

    if (consumed.count === 0) {
      throw unauthorized(
        "RESET_TICKET_INVALID",
        "This reset has already been used. Please request a new code.",
      );
    }

    if (user.passwordHash && (await checkPassword(user, body.password))) {
      throw badRequest(
        "PASSWORD_REUSED",
        "Please choose a password you haven't used before.",
      );
    }

    const passwordHash = await hashPassword(body.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // A reset exists to lock out whoever had access. Leaving other sessions
    // alive would defeat the entire point.
    await revokeAllSessions(user.id, "password_reset");
    void sendAuthEmail(user.email, buildPasswordChangedContent());

    // Sign them straight in: bouncing to a login form after proving ownership
    // twice is friction with no security value.
    const fresh = (await findUserById(user.id))!;
    const payload = await issueSession(req, res, fresh);
    ok(res, payload);
  }),
);

authRouter.post(
  "/set-password",
  requireAuth,
  handle(async (req, res) => {
    const body = setPasswordSchema.parse(req.body);
    const user = await findUserById(req.auth!.sub);

    if (!user) {
      throw unauthorized("SESSION_EXPIRED", "Please sign in.");
    }

    if (user.passwordHash) {
      // Changing an existing password is a different flow: it requires the
      // current one. This endpoint is only for Google accounts adding a first.
      throw badRequest(
        "PASSWORD_ALREADY_SET",
        "This account already has a password.",
      );
    }

    assertPasswordPolicy(body.password, user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.password) },
    });

    void sendAuthEmail(user.email, buildPasswordChangedContent());

    const fresh = (await findUserById(user.id))!;
    ok(res, { user: toAuthUser(fresh) });
  }),
);

