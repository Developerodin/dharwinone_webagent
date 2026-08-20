"use client";

import { useState, type FormEvent } from "react";
import {
  hasContactErrors,
  INITIAL_CONTACT_VALUES,
  validateContactField,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormField,
  type ContactFormValues,
  type LeadKind,
} from "@/lib/contactFormValidation";
import { submitLead } from "@/lib/submitLead";

export type { ContactFormField, ContactFormValues, LeadKind };

type UseContactFormOptions = {
  kind: LeadKind;
  toEmail: string | null;
  businessName: string;
};

/**
 * Shared contact and reservation form state with real SMTP submit.
 */
export function useContactForm({
  kind,
  toEmail,
  businessName,
}: UseContactFormOptions) {
  const [values, setValues] = useState<ContactFormValues>(INITIAL_CONTACT_VALUES);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactFormField, boolean>>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Updates a single field value and clears stale success state.
   */
  function setField(field: ContactFormField, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setIsSubmitted(false);
    setSubmitError(null);

    if (touched[field]) {
      setErrors((current) => ({
        ...current,
        [field]: validateContactField(field, value, kind),
      }));
    }
  }

  /**
   * Marks a field as touched and validates it immediately.
   */
  function blurField(field: ContactFormField): void {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({
      ...current,
      [field]: validateContactField(field, values[field], kind),
    }));
  }

  /**
   * Validates and emails the restaurant owner.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors = validateContactForm(values, kind);

    setTouched({
      name: true,
      email: true,
      phone: true,
      date: true,
      time: true,
      partySize: true,
      message: true,
    });
    setErrors(nextErrors);
    setIsSubmitted(false);
    setSubmitError(null);

    if (hasContactErrors(nextErrors)) {
      return;
    }

    if (!toEmail) {
      setSubmitError(
        "Couldn't send — no restaurant email. Set a contact email in chat first.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLead({
        kind,
        businessName,
        toEmail,
        values,
      });
      setIsSubmitted(true);
      setValues(INITIAL_CONTACT_VALUES);
      setTouched({});
      setErrors({});
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not send that request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const successMessage =
    kind === "reservation"
      ? "Reservation request submitted successfully."
      : "Enquiry submitted successfully.";

  return {
    kind,
    values,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    submitError,
    successMessage,
    setField,
    blurField,
    handleSubmit,
  };
}
