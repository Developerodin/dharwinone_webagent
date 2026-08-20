import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as authApi from "@/auth/authApi";
import { needsVerification } from "@/auth/authApi";
import { safeNextPath } from "@/auth/RequireAuth";
import { ApiError } from "@/auth/types";
import { useAuth } from "@/auth/useAuth";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  FormError,
  OrDivider,
  PasswordField,
  PrimaryButton,
  TextField,
} from "@/components/auth/fields";
import { GoogleButton } from "@/components/auth/GoogleButton";

/**
 * Sign-in screen.
 *
 * Google sits above the email form deliberately: it is the fastest path and
 * the one that avoids password-reset traffic entirely.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { adoptSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = safeNextPath(params.get("next"));

  /**
   * Routes a successful sign-in, respecting an unfinished signup.
   */
  const handleResult = (result: authApi.SignInResult) => {
    if (needsVerification(result)) {
      navigate("/verify", {
        replace: true,
        state: { email: result.email, maskedEmail: result.maskedEmail },
      });
      return;
    }
    adoptSession(result);
    navigate(result.user.onboarding.complete ? next : "/onboarding", {
      replace: true,
    });
  };

  /**
   * Turns an ApiError into the most useful message for this screen.
   */
  const handleError = (caught: unknown) => {
    if (!(caught instanceof ApiError)) {
      setError("Something went wrong. Please try again.");
      return;
    }

    // The server returns the same code whether the password was wrong or the
    // account is Google-only, so it cannot be used to enumerate. The `hint`
    // lets us point at the right button without leaking anything.
    if (caught.details.hint === "google_account") {
      setHint("It looks like you signed up with Google — use the button above.");
      setError(null);
      return;
    }

    if (caught.code === "ACCOUNT_LOCKED") {
      const seconds = caught.retryAfterSec ?? 900;
      setError(
        `Too many attempts. Try again in about ${Math.ceil(seconds / 60)} minutes.`,
      );
      return;
    }

    setError(caught.message);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setHint(null);

    try {
      handleResult(await authApi.login({ email: email.trim(), password }));
    } catch (caught) {
      handleError(caught);
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async (credential: string, nonce: string) => {
    setBusy(true);
    setError(null);
    try {
      handleResult(await authApi.googleSignIn({ credential, nonce }));
    } catch (caught) {
      handleError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to keep building."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="text-white/85 underline underline-offset-4 hover:text-white">
            Create an account
          </Link>
        </>
      }
    >
      <div className="google-slot">
        <GoogleButton onCredential={signInWithGoogle} disabled={busy} />
      </div>

      {hint ? (
        <p className="mt-3 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-center text-[13px] text-white/70">
          {hint}
        </p>
      ) : null}

      <OrDivider />

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          labelAction={
            <Link
              to="/forgot-password"
              className="text-[12px] text-white/50 underline underline-offset-4 hover:text-white/80"
            >
              Forgot password?
            </Link>
          }
        />

        <FormError message={error} />

        <PrimaryButton loading={busy}>Sign in</PrimaryButton>
      </form>
    </AuthShell>
  );
}
