import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuroraBackground } from "@/components/auth/AuroraBackground";
import { Spinner } from "@/components/auth/fields";
import { useAuth } from "./useAuth";

/**
 * Shown while the session is being recovered from the refresh cookie.
 *
 * A skeleton, not a redirect: rendering /login for the fraction of a second
 * before bootstrap resolves is the classic auth flicker, and it looks like a
 * bug to a signed-in user every time they reload.
 */
function AuthLoading() {
  return (
    <AuroraBackground>
      <Spinner size={22} />
    </AuroraBackground>
  );
}

/**
 * Gates a route behind sign-in, email verification, and onboarding — in that
 * order, because each stage is only reachable once the previous one is done.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthLoading />;

  if (status === "anon" || !user) {
    // Preserve where they were headed so the deep link survives sign-in.
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify" replace state={{ email: user.email }} />;
  }

  if (!user.onboarding.complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

/**
 * Requires a signed-in, verified user — but not a finished onboarding.
 *
 * The onboarding route needs this rather than RequireAuth: RequireAuth
 * redirects an unfinished user *to* /onboarding, so guarding /onboarding with
 * it would redirect the page to itself forever.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();

  if (status === "loading") return <AuthLoading />;
  if (status === "anon" || !user) return <Navigate to="/login" replace />;

  if (!user.emailVerified) {
    return <Navigate to="/verify" replace state={{ email: user.email }} />;
  }

  return <>{children}</>;
}

/**
 * Wraps the auth screens themselves: a signed-in user should not see a login
 * form, but must still be able to reach verification and onboarding.
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();

  if (status === "loading") return <AuthLoading />;

  if (status === "authed" && user) {
    if (!user.emailVerified) {
      return <Navigate to="/verify" replace state={{ email: user.email }} />;
    }
    if (!user.onboarding.complete) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Validates a `?next=` value before navigating to it.
 *
 * Must be a same-origin absolute path. Without this check an attacker can send
 * `/login?next=https://evil.example` and use our own sign-in page as a
 * credible-looking redirect to a phishing site.
 */
export function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
