import {
  isPlaceholderRestaurantEmail,
  isValidEmail,
} from "../lib/leadValidation.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { Page, PageSection, SectionType } from "../schemas/page.schema.js";

export const EMAIL_SYNC_SECTIONS: SectionType[] = [
  "contact",
  "footer",
  "reservation",
];

/**
 * Pulls the first plausible inbox out of a chat instruction.
 */
export function extractEmailFromText(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!match) return null;
  const email = match[0].trim();
  if (!isValidEmail(email) || isPlaceholderRestaurantEmail(email)) return null;
  return email;
}

/**
 * Writes a restaurant inbox onto a section content record.
 */
export function withEmailContent(
  content: Record<string, unknown>,
  email: string,
): Record<string, unknown> {
  return { ...content, email };
}

/**
 * Applies a contact inbox to brief + contact / footer / reservation (and
 * location_map when that section already has an email field).
 */
export function applySetEmailOp(
  page: Page,
  brief: Brief,
  email: string,
): string {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed) || isPlaceholderRestaurantEmail(trimmed)) {
    return "That email isn't usable for Contact Us. Send a real inbox (not a demo/placeholder).";
  }

  brief.email = trimmed;

  const updated: string[] = [];
  const targets = new Set<SectionType>(EMAIL_SYNC_SECTIONS);
  for (const section of page.sections) {
    if (section.type === "location_map" && "email" in section.content) {
      targets.add("location_map");
    }
  }

  for (const type of targets) {
    const section = page.sections.find((item: PageSection) => item.type === type);
    if (!section) continue;
    section.content = withEmailContent(section.content, trimmed);
    updated.push(type);
  }

  const where = updated.length > 0 ? updated.join(", ") : "brief";
  return `Updated contact email to ${trimmed} (${where}).`;
}
