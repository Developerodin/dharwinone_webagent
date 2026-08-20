import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as authApi from "@/auth/authApi";
import { ApiError } from "@/auth/types";
import { useAuth } from "@/auth/useAuth";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError, PasswordField, PrimaryButton } from "@/components/auth/fields";

type LocationState = { resetTicket?: string; email?: string };

/**
 * New password entry.
 *
 * On success the server revokes every session and signs this device back in,
 * so the user lands in the app rather than at a login form they just proved
 * ownership for twice.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adoptSession } = useAuth();
  const state = (location.state ?? {}) as LocationState;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state.resetTicket) navigate("/forgot-password", { replace: true });
  }, [state.resetTicket, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await authApi.resetPassword({
        resetTicket: state.resetTicket!,
        password,
      });
      adoptSession(result);
      navigate(result.user.onboarding.complete ? "/" : "/onboarding", {
        replace: true,
      });
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again.";
      setError(message);

      // An expired or reused ticket cannot be recovered on this screen.
      if (
        caught instanceof ApiError &&
        caught.code === "RESET_TICKET_INVALID"
      ) {
        window.setTimeout(
          () => navigate("/forgot-password", { replace: true }),
          1800,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="You'll be signed out on all other devices."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <PasswordField
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoFocus
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />

        <FormError message={error} />

        <PrimaryButton loading={busy}>Update password</PrimaryButton>
      </form>
    </AuthShell>
  );
}
