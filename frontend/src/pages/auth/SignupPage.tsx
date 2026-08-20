import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as authApi from "@/auth/authApi";
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

/** Domains typed by accident often enough to be worth catching. */
const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com",
};

/**
 * Scores a password for the strength meter.
 *
 * Deliberately length-weighted rather than symbol-weighted: it should reward a
 * long passphrase, not push people toward `Passw0rd!`.
 */
function scorePassword(value: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (value.length < 8) return { score: 0, label: "Too short" };

  let points = 0;
  if (value.length >= 12) points++;
  if (value.length >= 16) points++;
  if (/[^a-zA-Z]/.test(value)) points++;
  if (/\s/.test(value)) points++;

  if (points >= 3) return { score: 3, label: "Strong" };
  if (points >= 1) return { score: 2, label: "Good" };
  return { score: 1, label: "Weak" };
}

/**
 * Account creation screen.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const { adoptSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [needsInvite, setNeedsInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);

  /** Suggests a correction when the domain looks mistyped. */
  const typoSuggestion = useMemo(() => {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return null;
    const corrected = TYPO_DOMAINS[domain];
    return corrected ? `${email.split("@")[0]}@${corrected}` : null;
  }, [email]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await authApi.signup({
        email: email.trim(),
        password,
        ...(inviteCode ? { inviteCode } : {}),
      });
      navigate("/verify", {
        replace: true,
        state: {
          email: result.email,
          maskedEmail: result.maskedEmail,
          emailDelayed: result.emailDelayed,
        },
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "INVITE_REQUIRED") {
        setNeedsInvite(true);
      }
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const signUpWithGoogle = async (credential: string, nonce: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await authApi.googleSignIn({ credential, nonce });
      adoptSession(result);
      // Google verified the address, so verification is skipped entirely and
      // the user lands on onboarding with their name already filled in.
      navigate(result.user.onboarding.complete ? "/" : "/onboarding", {
        replace: true,
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Google sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Build your first site in a few minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-white/85 underline underline-offset-4 hover:text-white">
            Sign in
          </Link>
        </>
      }
    >
      <div className="google-slot">
        <GoogleButton onCredential={signUpWithGoogle} disabled={busy} />
      </div>

      <OrDivider />

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
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
          {typoSuggestion ? (
            <button
              type="button"
              onClick={() => setEmail(typoSuggestion)}
              className="mt-2 px-1 text-[12px] text-white/55 underline underline-offset-4 hover:text-white/85"
            >
              Did you mean {typoSuggestion}?
            </button>
          ) : null}
        </div>

        <div>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {password ? (
            <div className="mt-2.5 flex items-center gap-2 px-1">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3].map((level) => (
                  <span
                    key={level}
                    className={`h-1 flex-1 rounded-full transition ${
                      strength.score >= level
                        ? level === 3
                          ? "bg-emerald-400"
                          : level === 2
                            ? "bg-amber-400"
                            : "bg-[#f87171]"
                        : "bg-white/12"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[12px] text-white/50">{strength.label}</span>
            </div>
          ) : null}
        </div>

        {needsInvite ? (
          <TextField
            label="Invite code"
            placeholder="Enter your invite code"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            required
          />
        ) : null}

        <FormError message={error} />

        <PrimaryButton loading={busy}>Create account</PrimaryButton>

        <p className="px-1 text-center text-[12px] leading-relaxed text-white/40">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}
