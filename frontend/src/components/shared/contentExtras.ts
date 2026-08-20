import type { SectionType } from "@/types/page";

export type NavItem = {
  label: string;
  target: SectionType;
};

/**
 * Splits nav items into two groups for a centered-brand header.
 */
export function splitNavItems<T>(items: readonly T[]): { left: T[]; right: T[] } {
  const midpoint = Math.ceil(items.length / 2);
  return { left: items.slice(0, midpoint), right: items.slice(midpoint) };
}

/**
 * Prepends a Home → hero item when the nav list does not already include hero.
 */
export function withHomeNavItem(items: readonly NavItem[]): NavItem[] {
  if (items.some((item) => item.target === "hero")) return [...items];
  return [{ label: "Home", target: "hero" }, ...items];
}

/**
 * Safely reads nav items from section content.
 */
export function getNavItems(content: Record<string, unknown>): NavItem[] {
  const items = content.navItems;
  if (!Array.isArray(items)) {
    return [
      { label: "About", target: "about" },
      { label: "Menu", target: "menu" },
      { label: "Gallery", target: "gallery" },
      { label: "Reservations", target: "reservation" },
      { label: "Contact", target: "contact" },
    ];
  }

  return items
    .filter(
      (item): item is NavItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { target?: unknown }).target === "string",
    )
    .map((item) => ({
      label: item.label,
      target: item.target,
    }));
}
