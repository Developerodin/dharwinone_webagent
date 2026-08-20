type FormStatusBannerProps = {
  success: boolean;
  successMessage: string;
  error: string | null;
};

/**
 * Live region for lead-form success and delivery errors.
 */
export function FormStatusBanner({
  success,
  successMessage,
  error,
}: FormStatusBannerProps) {
  return (
    <div aria-live="polite">
      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-[var(--theme-ink)]"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-2xl border border-[var(--theme-accent)]/40 bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)]">
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}
