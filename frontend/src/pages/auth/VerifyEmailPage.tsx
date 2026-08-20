import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as authApi from "@/auth/authApi";
import { ApiError } from "@/auth/types";
import { useAuth } from "@/auth/useAuth";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError, Spinner } from "@/components/auth/fields";
import { OtpInput } from "@/components/auth/OtpInput";
import { formatCountdown, useCountdown } from "@/hooks/useCountdown";

/** Survives a refresh so the screen never strands the user without an email. */
const PENDING_KEY = "prowplus-pending-email";

type LocationState = {
  email?: string;
  maskedEmail?: string;
  emailDelayed?: boolean;
};

/**
 * Email verification screen.
 */
export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adoptSession } = useAuth();
  const state = (location.state ?? {}) as LocationState;

  // Route state is lost on reload, so mirror the address into sessionStorage.
  // Without this, refreshing this page leaves a code field with nothing to
  // submit it against.
  const [email] = useState<string>(() => {
    const fromState = state.email;
    if (fromState) {
      sessionStorage.setItem(PENDING_KEY, fromState);
      return fromState;
    }
    return sessionStorage.getItem(PENDING_KEY) ?? "";
  });

  const [masked] = useState<string>(state.maskedEmail ?? email);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [spamHint, setSpamHint] = useState(false);
  const { remaining, start } = useCountdown();

  useEffect(() => {
    if (!email) navigate("/login", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    start(60);
    // Codes usually arrive in seconds. If one hasn't after half a minute, the
    // most likely explanation is spam filtering, so say so unprompted.
    const timer = window.setTimeout(() => setSpamHint(true), 30_000);
    return () => window.clearTimeout(timer);
  }, [start]);

  const submitCode = async (code: string) => {
    setBusy(true);
    setError(null);
    setInvalid(false);

    try {
      const result = await authApi.verifyEmail({ email, code });
      sessionStorage.removeItem(PENDING_KEY);
      setSucceeded(true);
      adoptSession(result);

      // Let the success state register before moving on; an instant jump reads
      // as a glitch rather than a confirmation.
      window.setTimeout(() => {
        navigate(result.user.onboarding.complete ? "/" : "/onboarding", {
          replace: true,
        });
      }, 550);
    } catch (caught) {
      setInvalid(true);
      setError(
        caught instanceof ApiError
          ? caught.attemptsRemaining != null
            ? `${caught.message} ${caught.attemptsRemaining} attempts left.`
            : caught.message
          : "Something went wrong. Please try again.",
      );
      setBusy(false);
      // Reset the shake so a second wrong code animates again.
      window.setTimeout(() => setInvalid(false), 400);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const { retryAfterSec } = await authApi.resendOtp({
        email,
        purpose: "verify_email",
      });
      start(retryAfterSec);
    } catch (caught) {
      if (caught instanceof ApiError && caught.retryAfterSec) {
        start(caught.retryAfterSec);
      }
      setError(caught instanceof ApiError ? caught.message : null);
    }
  };

  if (succeeded) {
    return (
      <AuthShell title="You're in" subtitle="Setting things up…">
        <div className="flex justify-center py-4">
          <Spinner size={22} />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to{" "}
          <span className="text-white/80">{masked}</span>
        </>
      }
      footer={
        <Link to="/signup" className="underline underline-offset-4 hover:text-white/80">
          Wrong email? Start over
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        <OtpInput onComplete={submitCode} disabled={busy} invalid={invalid} />

        <FormError message={error} />

        <div className="text-center text-[13px] text-white/50">
          {remaining > 0 ? (
            <span>Resend code in {formatCountdown(remaining)}</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              className="text-white/80 underline underline-offset-4 hover:text-white"
            >
              Resend code
            </button>
          )}
        </div>

        {spamHint ? (
          <p className="text-center text-[12px] text-white/35">
            Can't find it? Check your spam folder.
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
