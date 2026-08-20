import { Router, type NextFunction, type Request, type Response } from "express";
import { authEnv } from "../config/env.js";
import { prisma } from "../db/client.js";
import { unauthorized } from "../lib/httpError.js";
import { ok } from "../lib/respond.js";
import { signAccessToken } from "../auth/tokens.js";
import { findUserById, toAuthUser } from "../auth/users.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { onboardingStepSchema } from "../schemas/auth.schema.js";

export const onboardingRouter = Router();

/**
 * Wraps an async handler so rejections reach the error middleware.
 */
function handle(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/** Maps a step number onto the column it writes. */
const STEP_FIELD = {
  1: "themePref",
  2: "fullName",
  3: "role",
  4: "companySize",
} as const;

/** Total steps in the wizard. */
const LAST_STEP = 4;

onboardingRouter.use(requireAuth);

/**
 * Persists one answer.
 *
 * Each step saves independently so a refresh, a dropped connection, or a closed
 * tab resumes exactly where the user left off rather than restarting the wizard.
 */
onboardingRouter.patch(
  "/step",
  handle(async (req, res) => {
    const body = onboardingStepSchema.parse(req.body);
    const userId = req.auth!.sub;

    const field = STEP_FIELD[body.step];
    // Never move the cursor backwards: answering step 2 again after reaching
    // step 4 (via the back arrow) must not discard the later answers.
    const nextStep = Math.min(body.step + 1, LAST_STEP);

    const profile = await prisma.onboardingProfile.upsert({
      where: { userId },
      create: { userId, [field]: body.value, currentStep: nextStep },
      update: { [field]: body.value },
    });

    const currentStep = Math.max(profile.currentStep, nextStep);
    if (currentStep !== profile.currentStep) {
      await prisma.onboardingProfile.update({
        where: { userId },
        data: { currentStep },
      });
    }

    ok(res, { currentStep, complete: profile.completedAt !== null });
  }),
);

/**
 * Marks onboarding complete and returns a refreshed access token.
 *
 * The token carries an `ob` claim used for routing; without reissuing it here
 * the route guard would bounce the user back into onboarding for up to one
 * token lifetime after they finished it.
 */
onboardingRouter.post(
  "/complete",
  handle(async (req, res) => {
    const userId = req.auth!.sub;

    // Idempotent: a double-click must not produce two completion timestamps.
    const existing = await prisma.onboardingProfile.findUnique({
      where: { userId },
      select: { completedAt: true },
    });

    if (!existing?.completedAt) {
      await prisma.onboardingProfile.upsert({
        where: { userId },
        create: { userId, currentStep: LAST_STEP, completedAt: new Date() },
        update: { currentStep: LAST_STEP, completedAt: new Date() },
      });
    }

    const user = await findUserById(userId);
    if (!user) {
      throw unauthorized("SESSION_EXPIRED", "Please sign in.");
    }

    const authUser = toAuthUser(user);
    const accessToken = signAccessToken({
      sub: user.id,
      sid: req.auth!.sid,
      email: user.email,
      ev: authUser.emailVerified,
      ob: true,
    });

    ok(res, {
      accessToken,
      expiresIn: authEnv().accessTtlSeconds,
      user: authUser,
    });
  }),
);

/**
 * Returns the saved answers so the wizard can resume.
 */
onboardingRouter.get(
  "/",
  handle(async (req, res) => {
    const user = await findUserById(req.auth!.sub);
    if (!user) {
      throw unauthorized("SESSION_EXPIRED", "Please sign in.");
    }
    ok(res, { onboarding: toAuthUser(user).onboarding });
  }),
);
