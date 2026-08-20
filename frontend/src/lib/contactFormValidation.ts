export type ContactFormField =
  | "name"
  | "email"
  | "phone"
  | "date"
  | "time"
  | "partySize"
  | "message";

export type ContactFormValues = Record<ContactFormField, string>;

export type ContactFormErrors = Partial<Record<ContactFormField, string>>;

export type LeadKind = "contact" | "reservation";

export const INITIAL_CONTACT_VALUES: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  partySize: "",
  message: "",
};

/**
 * Today's date as YYYY-MM-DD in local time.
 */
export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validates a single contact/reservation field.
 */
export function validateContactField(
  field: ContactFormField,
  value: string,
  kind: LeadKind,
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
    if (kind === "contact" && !trimmed) return undefined;
    if (!trimmed) return "Enter your phone number.";
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      return "Enter a 10 to 15 digit phone number.";
    }
    return undefined;
  }

  if (field === "date") {
    if (kind === "contact") return undefined;
    if (!trimmed) return "Choose a reservation date.";
    if (trimmed < todayIsoDate()) return "Pick today or a future date.";
    return undefined;
  }

  if (field === "time") {
    return undefined;
  }

  if (field === "partySize") {
    if (kind === "contact") return undefined;
    if (!trimmed) return "Enter the party size.";
    const count = Number(trimmed);
    if (!Number.isInteger(count) || count <= 0) {
      return "Party size must be a whole number.";
    }
    if (count > 20) return "For parties above 20, please call directly.";
    return undefined;
  }

  if (kind === "contact" && !trimmed) {
    return "Add a few more details so the team can prepare.";
  }
  if (trimmed && trimmed.length < 10 && kind === "contact") {
    return "Add a few more details so the team can prepare.";
  }
  if (trimmed.length > 400) {
    return "Keep your notes under 400 characters.";
  }
  return undefined;
}

/**
 * Validates every field for the given form kind.
 */
export function validateContactForm(
  values: ContactFormValues,
  kind: LeadKind,
): ContactFormErrors {
  const fields: ContactFormField[] =
    kind === "contact"
      ? ["name", "email", "phone", "message"]
      : ["name", "email", "phone", "date", "time", "partySize", "message"];

  const errors: ContactFormErrors = {};
  for (const field of fields) {
    const message = validateContactField(field, values[field], kind);
    if (message) errors[field] = message;
  }
  return errors;
}

/**
 * Returns true when the form has at least one validation error.
 */
export function hasContactErrors(errors: ContactFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
