import type { PageFamily } from "../config/pageFamily.js";
import type { Brief } from "../schemas/brief.schema.js";
import type { PageSection, SectionType } from "../schemas/page.schema.js";
import { pickComponent } from "./pickComponent.js";
import {
  listCatalogImagePaths,
  orientationForSection,
  pickGalleryImages,
  pickImage,
} from "./pickImage.js";

const NAV_LABELS: Partial<Record<SectionType, string>> = {
  about: "About",
  menu: "Menu",
  gallery: "Gallery",
  reservation: "Reservations",
  contact: "Contact",
  services: "Services",
  team: "Team",
  testimonials: "Reviews",
  location_map: "Find Us",
  stats: "Highlights",
};

/**
 * Builds default content for a newly added section.
 */
export function defaultSectionContent(
  type: SectionType,
  brief: Brief,
): Record<string, unknown> {
  switch (type) {
    case "header":
      return {
        brandName: brief.businessName,
        tagline: `Restaurant · ${brief.category}`,
        navItems: [
          { label: "About", target: "about" },
          { label: "Menu", target: "menu" },
          { label: "Gallery", target: "gallery" },
          { label: "Contact", target: "contact" },
        ],
      };
    case "hero":
      return {
        headline: `Welcome to ${brief.businessName}`,
        subheading: `Discover ${brief.category} hospitality, crafted for every visit.`,
        ctaLabel: "Explore Menu",
      };
    case "about":
      return {
        headline: "Our Story",
        body: `${brief.businessName} brings ${brief.category} flavors with care and warmth.`,
        caption: "Crafted with intention",
      };
    case "menu":
      return {
        headline: "Menu",
        introText: "Favorites from our kitchen",
        items:
          brief.menuItems.length > 0
            ? brief.menuItems.map((item) => ({
                name: item.name,
                price: item.price,
                description: item.description ?? undefined,
              }))
            : [
                { name: "Chef Special", price: 18, description: "Seasonal pick" },
              ],
      };
    case "gallery":
      return {
        headline: "Moments",
        caption: "A glimpse of the room and the plate",
      };
    case "location_map":
      return {
        headline: "Find Us",
        body: brief.address ?? "Visit us soon",
        directionsNote: "We look forward to hosting you",
      };
    case "services":
      return {
        headline: "What We Offer",
        introText: "Hospitality beyond the plate",
        items: [
          { title: "Dine In", description: "Warm service and seasonal plates." },
          { title: "Private Events", description: "Intimate gatherings, thoughtfully hosted." },
        ],
      };
    case "stats":
      return {
        headline: "By The Numbers",
        items: [
          { value: "10+", label: "Years hosting" },
          { value: "4.9", label: "Guest rating" },
        ],
      };
    case "testimonials":
      return {
        headline: "Guest Notes",
        introText: "Words from our tables",
        items: [
          {
            quote: "A memorable evening from first pour to last bite.",
            name: "Alex",
            role: "Regular guest",
          },
        ],
      };
    case "team":
      return {
        headline: "Meet The Team",
        introText: "The people behind the kitchen",
        members: [
          {
            name: "Head Chef",
            role: "Culinary lead",
            bio: "Seasonal cooking with a local heart.",
          },
        ],
      };
    case "reservation":
      return {
        headline: "Reserve a Table",
        body: "Tell us when you’d like to join us.",
        ctaLabel: "Request Reservation",
      };
    case "contact":
      return {
        headline: "Get In Touch",
        introText: "Questions, bookings, or private events — we are here.",
        ctaLabel: "Send Message",
        phone: brief.phone,
        address: brief.address,
      };
    case "footer":
      return {
        tagline: `Thank you for visiting ${brief.businessName}`,
        copyright: `© ${new Date().getFullYear()} ${brief.businessName}. All rights reserved.`,
        brandName: brief.businessName,
        phone: brief.phone,
        address: brief.address,
        navItems: [
          { label: "About", target: "about" },
          { label: "Menu", target: "menu" },
          { label: "Contact", target: "contact" },
        ],
      };
    default:
      return { headline: String(type) };
  }
}

/**
 * Builds assets for a newly added section.
 */
export function defaultSectionAssets(
  type: SectionType,
  family: PageFamily,
  brief: Brief,
): PageSection["assets"] {
  if (
    type === "menu" ||
    type === "services" ||
    type === "stats" ||
    type === "testimonials" ||
    type === "header" ||
    type === "footer" ||
    type === "contact" ||
    type === "reservation"
  ) {
    return [];
  }

  if (type === "gallery") {
    return pickGalleryImages(4, family, brief.category).map((path, index) => ({
      key: `gallery-${index}`,
      imagePath: path,
    }));
  }

  if (type === "team") {
    return listCatalogImagePaths({
      sectionType: "team",
      family,
      category: brief.category,
    })
      .slice(0, 3)
      .map((imagePath, index) => ({
        key: `team-${index}`,
        imagePath,
      }));
  }

  const imagePath = pickImage({
    sectionType: type,
    orientation: orientationForSection(type),
    family,
    category: brief.category,
  });
  return imagePath ? [{ key: "primary", imagePath }] : [];
}

/**
 * Creates a full section object for add_section ops.
 */
export function createDefaultSection(
  type: SectionType,
  family: PageFamily,
  brief: Brief,
): PageSection {
  return {
    type,
    componentId: pickComponent(type, family),
    content: defaultSectionContent(type, brief),
    assets: defaultSectionAssets(type, family, brief),
  };
}

/**
 * Nav label for a section type, if it should appear in header/footer.
 */
export function navLabelForSection(type: SectionType): string | null {
  return NAV_LABELS[type] ?? null;
}
