/** Supported component families for page rendering. */
export type PageFamily =
  | "premium"
  | "elegant"
  | "minimal"
  | "rustic"
  | "vibrant"
  | "bold";

const VALID_FAMILIES: PageFamily[] = [
  "premium",
  "elegant",
  "minimal",
  "rustic",
  "vibrant",
  "bold",
];

/**
 * Parses a page family from a query string or raw value.
 */
export function parsePageFamily(value: unknown): PageFamily | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return VALID_FAMILIES.includes(normalized as PageFamily)
    ? (normalized as PageFamily)
    : null;
}

/**
 * Reads the page family from the current URL search params.
 */
export function getPageFamilyFromUrl(): PageFamily {
  if (typeof window === "undefined") return "premium";
  const param = new URLSearchParams(window.location.search).get("family");
  return parsePageFamily(param) ?? "premium";
}

/**
 * Extracts the page family prefix from a component id.
 */
export function getFamilyFromComponentId(
  componentId: string,
): PageFamily | null {
  const prefix = componentId.split("-")[0];
  return parsePageFamily(prefix);
}

/**
 * Returns true when a component id belongs to the elegant family.
 */
export function isElegantComponent(componentId: string): boolean {
  return componentId.startsWith("elegant-");
}

/**
 * CSS theme class for a page family (applied on PageRenderer root).
 */
export function themeClassForFamily(family: PageFamily | null): string {
  switch (family) {
    case "elegant":
      return "elegant-theme";
    case "minimal":
      return "minimal-theme";
    case "rustic":
      return "rustic-theme";
    case "vibrant":
      return "vibrant-theme";
    case "bold":
      return "bold-theme";
    case "premium":
    default:
      return "premium-theme";
  }
}
