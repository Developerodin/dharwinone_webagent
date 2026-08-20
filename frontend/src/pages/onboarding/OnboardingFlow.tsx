import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Circle,
  Code2,
  Gauge,
  LayoutGrid,
  PenTool,
  Settings,
  Target,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import * as authApi from "@/auth/authApi";
import { useAuth } from "@/auth/useAuth";
import { AuroraBackground } from "@/components/auth/AuroraBackground";
import { AuthLogo } from "@/components/auth/AuthShell";
import {
  FormError,
  PrimaryButton,
  Spinner,
  TextField,
} from "@/components/auth/fields";
import { OptionCard, ThemeCard } from "@/components/auth/OptionCard";
import { ProgressDots } from "@/components/auth/ProgressDots";

const TOTAL_STEPS = 4;

const ROLES = [
  { value: "founder", label: "Founder", icon: <Building2 size={20} /> },
  { value: "product", label: "Product", icon: <LayoutGrid size={20} /> },
  { value: "designer", label: "Designer", icon: <PenTool size={20} /> },
  { value: "engineer", label: "Engineer", icon: <Code2 size={20} /> },
  { value: "consultant", label: "Consultant", icon: <Gauge size={20} /> },
  { value: "marketing_sales", label: "Marketing / Sales", icon: <Target size={20} /> },
  { value: "operations", label: "Operations", icon: <Settings size={20} /> },
  { value: "other", label: "Other", icon: <User size={20} /> },
] as const;

const COMPANY_SIZES = [
  { value: "solo", label: "Solo", icon: <Circle size={20} /> },
  { value: "2_20", label: "2 - 20", icon: <Users size={20} /> },
  { value: "21_200", label: "21 - 200", icon: <UsersRound size={20} /> },
  { value: "200_plus", label: "200+", icon: <UsersRound size={20} /> },
] as const;

type Answers = {
  themePref: "light" | "dark" | null;
  fullName: string;
  role: string | null;
  companySize: string | null;
};

/**
 * Four-question onboarding wizard.
 *
 * Every answer is saved as it is given, so a refresh, a dropped connection, or
 * a closed tab resumes at the same step instead of restarting. Saves are
 * fire-and-forget: a failed PATCH keeps the answer in local state and is
 * retried by the final complete call, because a flaky network must never trap
 * someone on step 2.
 */
export function OnboardingFlow() {
  const navigate = useNavigate();
  const { user, adoptSession } = useAuth();

  const [step, setStep] = useState(() => user?.onboarding.currentStep ?? 1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const [answers, setAnswers] = useState<Answers>(() => ({
    themePref: user?.onboarding.themePref ?? null,
    // Prefilled from Google when available — that is what turns a Google
    // signup into one click plus three taps.
    fullName: user?.onboarding.fullName ?? user?.name ?? "",
    role: user?.onboarding.role ?? null,
    companySize: user?.onboarding.companySize ?? null,
  }));

  /** Answers not yet confirmed by the server, replayed on complete. */
  const unsaved = useRef<Partial<Record<1 | 2 | 3 | 4, string>>>({});

  // Move focus to the new heading on each step so a screen reader announces
  // the question rather than leaving focus on a button that no longer exists.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  /**
   * Persists one answer without blocking the UI.
   */
  const save = useCallback(async (stepNumber: 1 | 2 | 3 | 4, value: string) => {
    try {
      await authApi.saveOnboardingStep({ step: stepNumber, value });
      delete unsaved.current[stepNumber];
    } catch {
      unsaved.current[stepNumber] = value;
    }
  }, []);

  const goTo = useCallback((next: number, how: "forward" | "back") => {
    setDirection(how);
    setStep(next);
  }, []);

  /**
   * Records an answer, saves it, and advances.
   */
  const answer = useCallback(
    (stepNumber: 1 | 2 | 3 | 4, key: keyof Answers, value: string) => {
      setAnswers((current) => ({ ...current, [key]: value }));
      void save(stepNumber, value);
      if (stepNumber < TOTAL_STEPS) goTo(stepNumber + 1, "forward");
    },
    [save, goTo],
  );

  /**
   * Flushes any failed step saves, then marks onboarding complete.
   */
  const finish = useCallback(
    async (finalCompanySize: string) => {
      setSubmitting(true);
      setError(null);

      try {
        const pending = Object.entries({
          ...unsaved.current,
          4: finalCompanySize,
        }) as Array<[string, string]>;

        for (const [stepNumber, value] of pending) {
          await authApi.saveOnboardingStep({
            step: Number(stepNumber) as 1 | 2 | 3 | 4,
            value,
          });
        }

        // Returns a fresh token carrying ob:true, so the route guard does not
        // bounce the user straight back into onboarding.
        const result = await authApi.completeOnboarding();
        adoptSession(result);
        navigate("/", { replace: true });
      } catch {
        setError("We couldn't save that. Please try again.");
        setSubmitting(false);
      }
    },
    [adoptSession, navigate],
  );

  // Apply the theme choice immediately rather than on Next: instant feedback
  // is the entire point of asking with a live preview.
  useEffect(() => {
    if (!answers.themePref) return;
    document.documentElement.classList.toggle(
      "dark",
      answers.themePref === "dark",
    );
  }, [answers.themePref]);

  const animationClass = useMemo(
    () => (direction === "forward" ? "auth-step-forward" : "auth-step-back"),
    [direction],
  );

  if (submitting) {
    return (
      <AuroraBackground>
        <div className="flex items-center gap-3 text-[15px] text-white/85">
          <Spinner size={18} />
          Submitting…
        </div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      {step > 1 ? (
        <button
          type="button"
          onClick={() => goTo(step - 1, "back")}
          aria-label="Go back"
          className="absolute left-6 top-6 rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-white/70 transition hover:bg-white/[0.09] hover:text-white"
        >
          <ArrowLeft size={17} />
        </button>
      ) : null}

      <div key={step} className={`w-full max-w-[560px] ${animationClass}`}>
        <div className="mb-6 flex justify-center">
          <AuthLogo size={52} />
        </div>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-center text-[30px] font-semibold leading-tight tracking-[-0.02em] text-white outline-none sm:text-[34px]"
        >
          {step === 1 ? "Pick your style" : null}
          {step === 2 ? "What's your name?" : null}
          {step === 3 ? "Which role fits you best?" : null}
          {step === 4 ? "How many people work at your company?" : null}
        </h1>

        <div className="mt-8">
          {step === 1 ? (
            <div className="mx-auto max-w-[380px]">
              <div className="grid grid-cols-2 gap-4">
                {(["light", "dark"] as const).map((mode) => (
                  <ThemeCard
                    key={mode}
                    mode={mode}
                    selected={answers.themePref === mode}
                    onSelect={() =>
                      setAnswers((current) => ({ ...current, themePref: mode }))
                    }
                  />
                ))}
              </div>
              <div className="mt-7">
                <PrimaryButton
                  type="button"
                  disabled={!answers.themePref}
                  onClick={() => answer(1, "themePref", answers.themePref!)}
                >
                  Next
                </PrimaryButton>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <form
              className="mx-auto max-w-[380px]"
              onSubmit={(event) => {
                event.preventDefault();
                if (answers.fullName.trim()) {
                  answer(2, "fullName", answers.fullName.trim());
                }
              }}
            >
              <TextField
                label="Full name"
                value={answers.fullName}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Your name"
                autoComplete="name"
                autoFocus
                maxLength={60}
              />
              <div className="mt-6">
                <PrimaryButton disabled={!answers.fullName.trim()}>
                  Next
                </PrimaryButton>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            // Selecting advances immediately — a confirm button on a
            // single-choice grid is a second tap that tells us nothing new.
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ROLES.map((role) => (
                <OptionCard
                  key={role.value}
                  label={role.label}
                  icon={role.icon}
                  selected={answers.role === role.value}
                  onSelect={() => answer(3, "role", role.value)}
                />
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COMPANY_SIZES.map((size) => (
                <OptionCard
                  key={size.value}
                  label={size.label}
                  icon={size.icon}
                  selected={answers.companySize === size.value}
                  onSelect={() => {
                    setAnswers((current) => ({
                      ...current,
                      companySize: size.value,
                    }));
                    void finish(size.value);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-auto mt-6 max-w-[380px]">
            <FormError message={error} />
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <ProgressDots total={TOTAL_STEPS} active={step} />
      </div>
    </AuroraBackground>
  );
}
