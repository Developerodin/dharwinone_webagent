import type { AuthUser } from "./types";

/**
 * Resolves a display name: profile name, onboarding full name, then email local-part.
 */
export function userDisplayName(user: AuthUser | null): string {
  const named = user?.name?.trim() || user?.onboarding.fullName?.trim();
  if (named) return named;
  const local = user?.email.split("@")[0]?.trim();
  if (!local) return "";
  const firstSegment = local.split(/[._+\-]/)[0] ?? local;
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}

/**
 * First token of the display name, for greetings like "Got an idea, Akshay?".
 */
export function userFirstName(user: AuthUser | null): string {
  const full = userDisplayName(user);
  if (!full) return "";
  return full.split(/\s+/)[0] ?? "";
}

/**
 * One or two initials for the sidebar avatar chip.
 */
export function userInitials(user: AuthUser | null): string {
  const full = userDisplayName(user);
  if (!full) return "?";
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return `${a}${b}`.toUpperCase();
  }
  return full.slice(0, 1).toUpperCase();
}
