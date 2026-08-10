/** Supported component families for page assembly. */
export type PageFamily =
  | "premium"
  | "elegant"
  | "minimal"
  | "rustic"
  | "vibrant";

const VALID_FAMILIES: PageFamily[] = [
  "premium",
  "elegant",
  "minimal",
  "rustic",
  "vibrant",
];

/**
 * Parses a page family string from env or query params.
 */
export function parsePageFamily(value: unknown): PageFamily | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return VALID_FAMILIES.includes(normalized as PageFamily)
    ? (normalized as PageFamily)
    : null;
}

/**
 * Resolves the active page family from env, falling back to premium.
 */
export function getDefaultPageFamily(): PageFamily {
  return parsePageFamily(process.env.PAGE_FAMILY) ?? "premium";
}

/**
 * Maps a visual family onto a catalog image pool family.
 * New themes reuse premium/elegant stock until dedicated assets exist.
 */
export function catalogFamilyFor(family: PageFamily): "premium" | "elegant" {
  if (family === "elegant") return "elegant";
  return "premium";
}
