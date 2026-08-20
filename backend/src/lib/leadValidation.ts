export const LEAD_KINDS = ["contact", "reservation"] as const;

export type LeadKind = (typeof LEAD_KINDS)[number];

export type LeadValues = {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: string;
  message: string;
};

export type LeadPayload = {
  kind: LeadKind;
  businessName: string;
  toEmail: string;
  values: LeadValues;
};

const VISITOR_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_EMAIL_HOSTS = new Set([
  "maisoncopper.com",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "localhost",
]);

/**
 * Returns true when a string looks like a real email address.
 */
export function isValidEmail(value: string): boolean {
  return VISITOR_EMAIL_RE.test(value.trim());
}

/**
 * Rejects empty, demo, and placeholder restaurant inboxes.
 */
export function isPlaceholderRestaurantEmail(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !isValidEmail(trimmed)) return true;
  const host = trimmed.split("@")[1] ?? "";
  return PLACEHOLDER_EMAIL_HOSTS.has(host);
}

/**
 * Escapes text for insertion into an HTML email.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Today's local date as YYYY-MM-DD.
 */
export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type FieldError = { field: keyof LeadValues | "toEmail" | "kind"; message: string };

export type LeadValidationResult =
  | { ok: true; payload: LeadPayload }
  | { ok: false; status: 400 | 422; error: string; fields?: FieldError[] };

/**
 * Normalizes unknown JSON into lead values.
 */
function readValues(raw: unknown): LeadValues {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  /**
   * Reads a string field from the visitor payload.
   */
  function read(key: keyof LeadValues): string {
    const value = record[key];
    return typeof value === "string" ? value.trim() : "";
  }
  return {
    name: read("name"),
    email: read("email"),
    phone: read("phone"),
    date: read("date"),
    time: read("time"),
    partySize: read("partySize"),
    message: read("message"),
  };
}

/**
 * Validates a contact or reservation lead before SMTP send.
 */
export function validateLeadPayload(body: unknown): LeadValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid lead payload." };
  }
  const record = body as Record<string, unknown>;
  const kind = record.kind;
  if (kind !== "contact" && kind !== "reservation") {
    return {
      ok: false,
      status: 400,
      error: "kind must be contact or reservation.",
      fields: [{ field: "kind", message: "kind must be contact or reservation." }],
    };
  }

  const businessName =
    typeof record.businessName === "string" ? record.businessName.trim() : "";
  const toEmail = typeof record.toEmail === "string" ? record.toEmail.trim() : "";
  const values = readValues(record.values);
  const fields: FieldError[] = [];

  if (!toEmail || isPlaceholderRestaurantEmail(toEmail)) {
    return {
      ok: false,
      status: 422,
      error: "No restaurant email configured.",
      fields: [
        {
          field: "toEmail",
          message: "Set a contact email in chat first.",
        },
      ],
    };
  }

  if (!values.name || values.name.length < 2) {
    fields.push({ field: "name", message: "Enter your full name." });
  }
  if (!isValidEmail(values.email)) {
    fields.push({ field: "email", message: "Enter a valid email address." });
  }

  if (kind === "contact") {
    if (!values.message || values.message.length < 10) {
      fields.push({
        field: "message",
        message: "Add a few more details so the team can prepare.",
      });
    }
  } else {
    const digits = values.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      fields.push({
        field: "phone",
        message: "Enter a 10 to 15 digit phone number.",
      });
    }
    if (!values.date) {
      fields.push({ field: "date", message: "Choose a reservation date." });
    } else if (values.date < todayIsoDate()) {
      fields.push({ field: "date", message: "Pick today or a future date." });
    }
    const count = Number(values.partySize);
    if (!Number.isInteger(count) || count <= 0) {
      fields.push({ field: "partySize", message: "Party size must be a whole number." });
    } else if (count > 20) {
      fields.push({
        field: "partySize",
        message: "For parties above 20, please call directly.",
      });
    }
  }

  if (values.message.length > 400) {
    fields.push({ field: "message", message: "Keep your notes under 400 characters." });
  }

  if (fields.length > 0) {
    return {
      ok: false,
      status: 400,
      error: fields[0]?.message ?? "Check the form and try again.",
      fields,
    };
  }

  return {
    ok: true,
    payload: {
      kind,
      businessName: businessName || "Restaurant",
      toEmail,
      values,
    },
  };
}
