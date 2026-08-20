import type { ContactFormValues } from "@/lib/contactFormValidation";

export type LeadKind = "contact" | "reservation";

export type SubmitLeadArgs = {
  kind: LeadKind;
  businessName: string;
  toEmail: string;
  values: ContactFormValues;
};

/**
 * Posts a visitor form to the SMTP leads endpoint.
 */
export async function submitLead(args: SubmitLeadArgs): Promise<void> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
  };
  if (!response.ok || !data.ok) {
    throw new Error(
      data.error || "Could not send that request. Please try again.",
    );
  }
}
