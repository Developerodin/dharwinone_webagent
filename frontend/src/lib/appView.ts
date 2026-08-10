export type AppView = "home" | "builder";

/**
 * Reads the app view from the URL hash (`#home` | `#builder`).
 * Defaults to home when hash is missing or unknown.
 */
export function readAppViewFromHash(): AppView {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  return hash === "builder" ? "builder" : "home";
}

/**
 * Syncs the URL hash to the active app view without a full navigation.
 */
export function writeAppViewHash(view: AppView): void {
  if (typeof window === "undefined") return;
  const nextHash = `#${view}`;
  if (window.location.hash === nextHash) return;
  window.history.replaceState(null, "", nextHash);
}
