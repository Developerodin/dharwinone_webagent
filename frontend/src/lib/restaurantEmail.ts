const PLACEHOLDER_HOSTS = new Set([
  "maisoncopper.com",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "localhost",
]);

/**
 * Returns a restaurant inbox from section content, or null for placeholders.
 */
export function getRestaurantEmail(content: Record<string, unknown>): string | null {
  const raw = content.email;
  if (typeof raw !== "string") return null;
  const email = raw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const host = email.split("@")[1]?.toLowerCase() ?? "";
  if (PLACEHOLDER_HOSTS.has(host)) return null;
  return email;
}

/**
 * Reads a display name for lead emails.
 */
export function getRestaurantName(content: Record<string, unknown>): string {
  const brand =
    typeof content.brandName === "string" ? content.brandName.trim() : "";
  if (brand) return brand;
  const headline =
    typeof content.headline === "string" ? content.headline.trim() : "";
  return headline || "Restaurant";
}
