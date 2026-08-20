import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as authApi from "@/auth/authApi";
import { ApiError } from "@/auth/types";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError } from "@/components/auth/fields";
import { OtpInput } from "@/components/auth/OtpInput";
import { formatCountdown, useCountdown } from "@/hooks/useCountdown";

type LocationState = { email?: string; maskedEmail?: string };

/**
 * Reset code entry. Exchanges a valid code for a single-use reset ticket.
 */
export function ResetCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const { remaining, start } = useCountdown();

  const email = state.email ?? "";

  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    start(60);
  }, [start]);

  const submitCode = async (code: string) => {
    setBusy(true);
    setError(null);
    setInvalid(false);

    try {
      const { resetTicket } = await authApi.verifyResetOtp({ email, code });
      // The ticket lives only in route state: it is short-lived and single-use,
      // and persisting it would leave a usable credential in storage.
      navigate("/reset-password", { replace: true, state: { resetTicket, email } });
    } catch (caught) {
      setInvalid(true);
      setError(
        caught instanceof ApiError ? caught.message : "That code is not correct.",
      );
      setBusy(false);
      window.setTimeout(() => setInvalid(false), 400);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const { retryAfterSec } = await authApi.resendOtp({
        email,
        purpose: "reset_password",
      });
      start(retryAfterSec);
    } catch (caught) {
      if (caught instanceof ApiError && caught.retryAfterSec) {
        start(caught.retryAfterSec);
      }
    }
  };

  return (
    <AuthShell
      title="Enter your code"
      subtitle={
        <>
          We sent a 6-digit code to{" "}
          <span className="text-white/80">{state.maskedEmail ?? email}</span>
        </>
      }
      footer={
        <Link to="/login" className="underline underline-offset-4 hover:text-white/80">
          Back to sign in
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
      </div>
    </AuthShell>
  );
}
