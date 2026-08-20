import { z } from "zod";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../auth/passwords.js";

/**
 * Request bodies for /api/auth and /api/auth/onboarding.
 *
 * Shape validation only. Policy that needs to explain itself to the user
 * (password strength, OTP attempts) lives in the auth modules so it can return
 * a specific error code rather than a generic VALIDATION_ERROR.
 */

/** Email: bounded length so a pathological value cannot reach argon2 or SMTP. */
const email = z.string().trim().min(3).max(254).email();

/** Password at the schema layer: length only. Strength is checked separately. */
const password = z.string().min(1).max(MAX_PASSWORD_LENGTH);

/** Exactly six digits. Trimmed because pasted codes carry whitespace. */
const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code.");

export const signupSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(80).optional(),
  inviteCode: z.string().trim().max(64).optional(),
});

export const loginSchema = z.object({
  email,
  password,
});

export const verifyEmailSchema = z.object({
  email,
  code: otpCode,
});

export const resendOtpSchema = z.object({
  email,
  purpose: z.enum(["verify_email", "reset_password"]),
});

export const googleSchema = z.object({
  credential: z.string().min(16).max(8192),
  nonce: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const verifyResetOtpSchema = z.object({
  email,
  code: otpCode,
});

export const resetPasswordSchema = z.object({
  resetTicket: z.string().min(16).max(4096),
  password,
});

export const setPasswordSchema = z.object({
  password,
});

/** Onboarding steps, keyed to the four screens in the product spec. */
export const onboardingStepSchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal(1), value: z.enum(["light", "dark"]) }),
  z.object({ step: z.literal(2), value: z.string().trim().min(1).max(60) }),
  z.object({
    step: z.literal(3),
    value: z.enum([
      "founder",
      "product",
      "designer",
      "engineer",
      "consultant",
      "marketing_sales",
      "operations",
      "other",
    ]),
  }),
  z.object({
    step: z.literal(4),
    value: z.enum(["solo", "2_20", "21_200", "200_plus"]),
  }),
]);

export type SignupBody = z.infer<typeof signupSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type OnboardingStepBody = z.infer<typeof onboardingStepSchema>;

export { MIN_PASSWORD_LENGTH };
