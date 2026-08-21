import { useId } from "react";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { FormStatusBanner } from "@/components/shared/FormStatusBanner";
import { useContactForm, type LeadKind } from "@/components/shared/useContactForm";
import type { ContactFormField } from "@/lib/contactFormValidation";
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
  /** Submit row alignment. Fields stay left for readability. */
  align?: "left" | "center";
};

type LeadFormFieldProps = {
  formId: string;
  field: ContactFormField;
  label: string;
  value: string;
  error?: string;
  tokens: ThemeTokens;
  type?: string;
  autoComplete?: string;
  rows?: number;
  onChange: (value: string) => void;
  onBlur: () => void;
};

/**
 * Stable field chrome. Must live at module scope — a nested component remounts
 * the input on every keystroke and steals focus.
 */
function LeadFormField({
  formId,
  field,
  label,
  value,
  error,
  tokens,
  type = "text",
  autoComplete,
  rows,
  onChange,
  onBlur,
}: LeadFormFieldProps) {
  const id = `${formId}-${field}`;
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
      <span>{label}</span>
      {rows ? (
        <textarea
          id={id}
          name={field}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
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

/**
 * Wired contact/reservation form used by family-kit sections.
 */
export function SiteLeadForm({
  content,
  tokens,
  kind,
  submitLabel,
  layout,
  align = "left",
}: SiteLeadFormProps) {
  const formId = useId();
  const form = useContactForm({
    kind,
    toEmail: getRestaurantEmail(content),
    businessName: getRestaurantName(content),
  });

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
            <LeadFormField
              formId={formId}
              field="name"
              label="Name"
              autoComplete="name"
              tokens={tokens}
              value={form.values.name}
              error={form.errors.name}
              onChange={(value) => form.setField("name", value)}
              onBlur={() => form.blurField("name")}
            />
            <LeadFormField
              formId={formId}
              field="email"
              label="Email"
              type="email"
              autoComplete="email"
              tokens={tokens}
              value={form.values.email}
              error={form.errors.email}
              onChange={(value) => form.setField("email", value)}
              onBlur={() => form.blurField("email")}
            />
          </div>
          <LeadFormField
            formId={formId}
            field="message"
            label="Message"
            rows={6}
            tokens={tokens}
            value={form.values.message}
            error={form.errors.message}
            onChange={(value) => form.setField("message", value)}
            onBlur={() => form.blurField("message")}
          />
        </>
      ) : (
        <>
          <div className="grid gap-4 @min-[640px]:grid-cols-2">
            <LeadFormField
              formId={formId}
              field="name"
              label="Name"
              autoComplete="name"
              tokens={tokens}
              value={form.values.name}
              error={form.errors.name}
              onChange={(value) => form.setField("name", value)}
              onBlur={() => form.blurField("name")}
            />
            <LeadFormField
              formId={formId}
              field="email"
              label="Email"
              type="email"
              autoComplete="email"
              tokens={tokens}
              value={form.values.email}
              error={form.errors.email}
              onChange={(value) => form.setField("email", value)}
              onBlur={() => form.blurField("email")}
            />
            <LeadFormField
              formId={formId}
              field="phone"
              label="Phone"
              type="tel"
              autoComplete="tel"
              tokens={tokens}
              value={form.values.phone}
              error={form.errors.phone}
              onChange={(value) => form.setField("phone", value)}
              onBlur={() => form.blurField("phone")}
            />
            <LeadFormField
              formId={formId}
              field="date"
              label="Date"
              type="date"
              tokens={tokens}
              value={form.values.date}
              error={form.errors.date}
              onChange={(value) => form.setField("date", value)}
              onBlur={() => form.blurField("date")}
            />
            <LeadFormField
              formId={formId}
              field="time"
              label="Time"
              type="time"
              tokens={tokens}
              value={form.values.time}
              error={form.errors.time}
              onChange={(value) => form.setField("time", value)}
              onBlur={() => form.blurField("time")}
            />
            <LeadFormField
              formId={formId}
              field="partySize"
              label="Party size"
              type="number"
              tokens={tokens}
              value={form.values.partySize}
              error={form.errors.partySize}
              onChange={(value) => form.setField("partySize", value)}
              onBlur={() => form.blurField("partySize")}
            />
          </div>
          <LeadFormField
            formId={formId}
            field="message"
            label="Notes"
            rows={5}
            tokens={tokens}
            value={form.values.message}
            error={form.errors.message}
            onChange={(value) => form.setField("message", value)}
            onBlur={() => form.blurField("message")}
          />
        </>
      )}
      <div className={`flex ${align === "center" ? "justify-center" : "justify-start"}`}>
        <button
          type="submit"
          className={`${tokens.primaryButton} h-auto max-w-full whitespace-normal text-balance`}
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
