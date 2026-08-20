import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  isPlaceholderRestaurantEmail,
  validateLeadPayload,
} from "./leadValidation.js";

describe("leadValidation", () => {
  it("rejects placeholder restaurant inboxes", () => {
    expect(isPlaceholderRestaurantEmail("reservations@maisoncopper.com")).toBe(
      true,
    );
    expect(isPlaceholderRestaurantEmail("hello@example.com")).toBe(true);
    expect(isPlaceholderRestaurantEmail("")).toBe(true);
    expect(isPlaceholderRestaurantEmail("reservations@nonnarosa.com")).toBe(
      false,
    );
  });

  it("escapes HTML in email bodies", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("returns 422 when restaurant email is missing", () => {
    const result = validateLeadPayload({
      kind: "contact",
      businessName: "Nonna",
      toEmail: "",
      values: {
        name: "Ada",
        email: "ada@mail.com",
        phone: "",
        date: "",
        time: "",
        partySize: "",
        message: "We would like a quiet table please.",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
  });

  it("returns 400 on a bad visitor payload", () => {
    const result = validateLeadPayload({
      kind: "reservation",
      businessName: "Nonna",
      toEmail: "reservations@nonnarosa.com",
      values: {
        name: "A",
        email: "not-an-email",
        phone: "123",
        date: "2000-01-01",
        time: "",
        partySize: "0",
        message: "",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("accepts a valid reservation payload", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);
    const result = validateLeadPayload({
      kind: "reservation",
      businessName: "Nonna",
      toEmail: "reservations@nonnarosa.com",
      values: {
        name: "Ada Lovelace",
        email: "ada@mail.com",
        phone: "9876543210",
        date,
        time: "19:30",
        partySize: "4",
        message: "Window if possible",
      },
    });
    expect(result.ok).toBe(true);
  });
});
