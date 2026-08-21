import type { Brief } from "@/types/intake";
import type { Page, SectionType } from "@/types/page";

/**
 * Title for the post-build roundup card.
 */
export function formatRoundupTitle(businessName: string): string {
  const name = businessName.trim() || "your site";
  return `Built ${name} site design`;
}

/**
 * Follow-up chips after a build, skipping things the page already has.
 */
export function suggestionChipsForPage(
  page: Page | null,
  brief: Brief | null,
): string[] {
  const types = new Set<SectionType>(
    (page?.sections ?? []).map((section) => section.type),
  );
  const chips: string[] = [];

  if (!types.has("reservation")) {
    chips.push("Add a real reservation form");
  }
  if (!types.has("menu")) {
    chips.push("Add a full menu with prices");
  } else {
    chips.push("Create a downloadable menu page");
  }
  const missingPlace =
    !brief?.address?.trim() || !brief.hours || brief.hours.length === 0;
  if (missingPlace) {
    chips.push("Set real hours and address");
  }
  if (!types.has("gallery")) {
    chips.push("Add a photo gallery");
  }
  if (!types.has("testimonials")) {
    chips.push("Add guest reviews");
  }
  if (chips.length < 4) {
    chips.push("Integrate online ordering");
  }

  return chips.slice(0, 4);
}
