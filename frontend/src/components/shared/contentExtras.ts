import type { SectionType } from "@/types/page";

export type NavItem = {
  label: string;
  target: SectionType;
};

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
