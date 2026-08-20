import { apiRequest } from "@/lib/apiClient";
import type { AuthSuccess, AuthUser, VerifyRequired } from "./types";

/**
 * Typed wrappers over the /api/auth surface.
 *
 * Every call goes through apiRequest so the refresh interceptor and error
 * envelope handling stay in exactly one place.
 */

const anon = { anonymous: true } as const;

/** A response that either establishes a session or asks for verification. */
export type SignInResult = AuthSuccess | VerifyRequired;

/**
 * Narrows a sign-in result to the "go verify your email" branch.
 */
export function needsVerification(
  result: SignInResult,
): result is VerifyRequired {
  return "next" in result && result.next === "verify_email";
}

export async function signup(input: {
  email: string;
  password: string;
  name?: string;
  inviteCode?: string;
}): Promise<VerifyRequired> {
  return apiRequest("/api/auth/signup", { method: "POST", body: input, ...anon });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  return apiRequest("/api/auth/login", { method: "POST", body: input, ...anon });
}

export async function verifyEmail(input: {
  email: string;
  code: string;
}): Promise<AuthSuccess> {
  return apiRequest("/api/auth/verify-email", {
    method: "POST",
    body: input,
    ...anon,
  });
}

export async function resendOtp(input: {
  email: string;
  purpose: "verify_email" | "reset_password";
}): Promise<{ retryAfterSec: number }> {
  return apiRequest("/api/auth/resend-otp", {
    method: "POST",
    body: input,
    ...anon,
  });
}

export async function googleSignIn(input: {
  credential: string;
  nonce: string;
}): Promise<AuthSuccess> {
  return apiRequest("/api/auth/google", { method: "POST", body: input, ...anon });
}

export async function forgotPassword(input: {
  email: string;
}): Promise<{ sent: boolean; maskedEmail: string; retryAfterSec: number }> {
  return apiRequest("/api/auth/forgot-password", {
    method: "POST",
    body: input,
    ...anon,
  });
}

export async function verifyResetOtp(input: {
  email: string;
  code: string;
}): Promise<{ resetTicket: string; expiresAt: string }> {
  return apiRequest("/api/auth/verify-reset-otp", {
    method: "POST",
    body: input,
    ...anon,
  });
}

export async function resetPassword(input: {
  resetTicket: string;
  password: string;
}): Promise<AuthSuccess> {
  return apiRequest("/api/auth/reset-password", {
    method: "POST",
    body: input,
    ...anon,
  });
}

export async function logout(): Promise<void> {
  await apiRequest("/api/auth/logout", { method: "POST", ...anon });
}

export async function fetchMe(): Promise<{ user: AuthUser }> {
  return apiRequest("/api/auth/me");
}

export async function saveOnboardingStep(input: {
  step: 1 | 2 | 3 | 4;
  value: string;
}): Promise<{ currentStep: number; complete: boolean }> {
  return apiRequest("/api/auth/onboarding/step", {
    method: "PATCH",
    body: input,
  });
}

export async function completeOnboarding(): Promise<AuthSuccess> {
  return apiRequest("/api/auth/onboarding/complete", { method: "POST" });
}
