import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as authApi from "@/auth/authApi";
import { ApiError } from "@/auth/types";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError, PrimaryButton, TextField } from "@/components/auth/fields";

/**
 * Password reset request.
 *
 * The response is identical whether or not the address is registered, so this
 * screen always advances to the code step. Anything else would turn the form
 * into an account-enumeration oracle.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await authApi.forgotPassword({ email: email.trim() });
      navigate("/reset-code", {
        state: { email: email.trim(), maskedEmail: result.maskedEmail },
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll send a 6-digit code to your email."
      footer={
        <Link to="/login" className="underline underline-offset-4 hover:text-white/80">
          Back to sign in
        </Link>
      }
    >
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
          autoFocus
        />

        <FormError message={error} />

        <PrimaryButton loading={busy}>Send code</PrimaryButton>
      </form>
    </AuthShell>
  );
}
