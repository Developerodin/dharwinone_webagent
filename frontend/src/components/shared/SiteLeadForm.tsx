import { useId } from "react";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { FormStatusBanner } from "@/components/shared/FormStatusBanner";
import { useContactForm, type LeadKind } from "@/components/shared/useContactForm";
import {
  getRestaurantEmail,
  getRestaurantName,
} from "@/lib/restaurantEmail";

type SiteLeadFormProps = {
  content: Record<string, unknown>;
  tokens: ThemeTokens;
  kind: LeadKind;
  submitLabel: string;
  /** Reservation form includes date/time/party; enquiry is name/email/message. */
  layout: "enquiry" | "reservation";
};

/**
 * Wired contact/reservation form used by family-kit sections.
 */
export function SiteLeadForm({
  content,
  tokens,
  kind,
  submitLabel,
  layout,
}: SiteLeadFormProps) {
  const formId = useId();
  const form = useContactForm({
    kind,
    toEmail: getRestaurantEmail(content),
    businessName: getRestaurantName(content),
  });

  /**
   * Shared field chrome for family-kit inputs.
   */
  function Field({
    field,
    label,
    type = "text",
    autoComplete,
    rows,
  }: {
    field: "name" | "email" | "phone" | "date" | "time" | "partySize" | "message";
    label: string;
    type?: string;
    autoComplete?: string;
    rows?: number;
  }) {
    const id = `${formId}-${field}`;
    const error = form.errors[field];
    const describedBy = error ? `${id}-error` : undefined;
    return (
      <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
        <span>{label}</span>
        {rows ? (
          <textarea
            id={id}
            name={field}
            rows={rows}
            value={form.values[field]}
            onChange={(event) => form.setField(field, event.target.value)}
            onBlur={() => form.blurField(field)}
            className={`${tokens.input} resize-none`}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
          />
        ) : (
          <input
            id={id}
            name={field}
            type={type}
            autoComplete={autoComplete}
            value={form.values[field]}
            onChange={(event) => form.setField(field, event.target.value)}
            onBlur={() => form.blurField(field)}
            className={tokens.input}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            aria-label={label}
          />
        )}
        {error ? (
          <p id={`${id}-error`} className="text-sm text-red-400">
            {error}
          </p>
        ) : null}
      </label>
    );
  }

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={(event) => void form.handleSubmit(event)}
      aria-label={kind === "reservation" ? "Reservation form" : "Contact form"}
    >
      {layout === "enquiry" ? (
        <>
          <div className="grid gap-4 @min-[640px]:grid-cols-2">
            <Field field="name" label="Name" autoComplete="name" />
            <Field field="email" label="Email" type="email" autoComplete="email" />
          </div>
          <Field field="message" label="Message" rows={6} />
        </>
      ) : (
        <>
          <div className="grid gap-4 @min-[640px]:grid-cols-2">
            <Field field="name" label="Name" autoComplete="name" />
            <Field field="email" label="Email" type="email" autoComplete="email" />
            <Field field="phone" label="Phone" type="tel" autoComplete="tel" />
            <Field field="date" label="Date" type="date" />
            <Field field="time" label="Time" type="time" />
            <Field field="partySize" label="Party size" type="number" />
          </div>
          <Field field="message" label="Notes" rows={5} />
        </>
      )}
      <div className="flex justify-start">
        <button
          type="submit"
          className={tokens.primaryButton}
          disabled={form.isSubmitting}
        >
          {form.isSubmitting ? "Sending..." : submitLabel}
        </button>
      </div>
      <FormStatusBanner
        success={form.isSubmitted}
        successMessage={form.successMessage}
        error={form.submitError}
      />
    </form>
  );
}
