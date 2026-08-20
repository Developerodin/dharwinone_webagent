import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import {
  RedirectIfAuthed,
  RequireAuth,
  RequireSession,
} from "@/auth/RequireAuth";
import { AuroraBackground } from "@/components/auth/AuroraBackground";
import { Spinner } from "@/components/auth/fields";
import { ChatApp } from "./ChatApp";

/**
 * Auth and onboarding are code-split away from the builder.
 *
 * A first-time visitor should not download the entire editor before seeing a
 * sign-in form, and a returning user should not pay for auth screens they will
 * never open again.
 */
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("@/pages/auth/SignupPage").then((m) => ({ default: m.SignupPage })),
);
const VerifyEmailPage = lazy(() =>
  import("@/pages/auth/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetCodePage = lazy(() =>
  import("@/pages/auth/ResetCodePage").then((m) => ({
    default: m.ResetCodePage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("@/pages/auth/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const OnboardingFlow = lazy(() =>
  import("@/pages/onboarding/OnboardingFlow").then((m) => ({
    default: m.OnboardingFlow,
  })),
);

/**
 * Fallback shown while a lazy route chunk loads. Uses the same aurora shell as
 * the screens themselves so the transition is a fade, not a flash of white.
 */
function RouteFallback() {
  return (
    <AuroraBackground>
      <Spinner size={22} />
    </AuroraBackground>
  );
}

/**
 * Root application entry — auth gate → home dashboard → builder shell.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <LoginPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/signup"
              element={
                <RedirectIfAuthed>
                  <SignupPage />
                </RedirectIfAuthed>
              }
            />
            {/* Not wrapped in RedirectIfAuthed: a signed-in but unverified user
                must be able to reach this screen, and that guard sends them here. */}
            <Route path="/verify" element={<VerifyEmailPage />} />
            <Route
              path="/forgot-password"
              element={
                <RedirectIfAuthed>
                  <ForgotPasswordPage />
                </RedirectIfAuthed>
              }
            />
            <Route path="/reset-code" element={<ResetCodePage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route
              path="/onboarding"
              element={
                <RequireSession>
                  <OnboardingFlow />
                </RequireSession>
              }
            />

            {/* The builder keeps its own #home / #builder / #gallery hash
                routing untouched; react-router only owns the path. */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <ChatApp />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
