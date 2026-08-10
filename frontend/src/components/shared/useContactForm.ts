"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export type ContactFormField =
  | "name"
  | "email"
  | "phone"
  | "date"
  | "partySize"
  | "message";

export type ContactFormValues = Record<ContactFormField, string>;

type ContactFormErrors = Partial<Record<ContactFormField, string>>;

const INITIAL_VALUES: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  date: "",
  partySize: "",
  message: "",
};

/**
 * Validates a single reservation form field.
 */
function validateContactField(
  field: ContactFormField,
  value: string,
): string | undefined {
  const trimmed = value.trim();

  if (field === "name") {
    if (!trimmed) return "Enter your full name.";
    if (trimmed.length < 2) return "Name should be at least 2 characters.";
    return undefined;
  }

  if (field === "email") {
    if (!trimmed) return "Enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Enter a valid email address.";
    }
    return undefined;
  }

  if (field === "phone") {
    if (!trimmed) return "Enter your phone number.";
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      return "Enter a 10 to 15 digit phone number.";
    }
    return undefined;
  }

  if (field === "date") {
    if (!trimmed) return "Choose a reservation date.";
    return undefined;
  }

  if (field === "partySize") {
    if (!trimmed) return "Enter the party size.";
    const count = Number(trimmed);
    if (!Number.isInteger(count) || count <= 0) {
      return "Party size must be a whole number.";
    }
    if (count > 20) return "For parties above 20, please call directly.";
    return undefined;
  }

  if (trimmed && trimmed.length < 10) {
    return "Add a few more details so the team can prepare.";
  }

  if (trimmed.length > 400) {
    return "Keep your notes under 400 characters.";
  }

  return undefined;
}

/**
 * Validates every field in the reservation contact form.
 */
function validateContactForm(values: ContactFormValues): ContactFormErrors {
  return {
    name: validateContactField("name", values.name),
    email: validateContactField("email", values.email),
    phone: validateContactField("phone", values.phone),
    date: validateContactField("date", values.date),
    partySize: validateContactField("partySize", values.partySize),
    message: validateContactField("message", values.message),
  };
}

/**
 * Returns true when the form has at least one validation error.
 */
function hasContactErrors(errors: ContactFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/**
 * Shared contact and reservation form state with blur + submit validation.
 */
export function useContactForm() {
  const [values, setValues] = useState<ContactFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactFormField, boolean>>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  /**
   * Updates a single field value and clears stale success state.
   */
  function setField(field: ContactFormField, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setIsSubmitted(false);

    if (touched[field]) {
      setErrors((current) => ({
        ...current,
        [field]: validateContactField(field, value),
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
      [field]: validateContactField(field, values[field]),
    }));
  }

  /**
   * Validates the form and surfaces a success state for preview demos.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors = validateContactForm(values);

    setTouched({
      name: true,
      email: true,
      phone: true,
      date: true,
      partySize: true,
      message: true,
    });
    setErrors(nextErrors);
    setIsSubmitted(false);

    if (hasContactErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 220);
    });
    setIsSubmitting(false);
    setIsSubmitted(true);
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    setField,
    blurField,
    handleSubmit,
  };
}
