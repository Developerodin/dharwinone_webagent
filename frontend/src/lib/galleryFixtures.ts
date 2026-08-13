import { parseGalleryComponentId } from "@/lib/galleryCatalog";
import type { Page, PageAsset, PageSection, SectionType } from "@/types/page";
import { DEFAULT_SECTION_LAYOUT } from "@/types/page";

const BRAND = "Nonna Rosa Trattoria";
const PHONE = "(555) 234-8890";
const ADDRESS = "42 Via Roma Street, Brooklyn, NY 11201";
const EMAIL = "reservations@nonnarosa.com";
const HOURS = ["Mon–Thu · 12:00 – 22:00", "Fri–Sun · 12:00 – 23:00"];

const NAV_ITEMS = [
  { label: "About", target: "about" },
  { label: "Menu", target: "menu" },
  { label: "Gallery", target: "gallery" },
  { label: "Reservations", target: "reservation" },
  { label: "Contact", target: "contact" },
];

/** Shared restaurant photography from the local image catalog. */
const GALLERY_ASSETS: PageAsset[] = [
  { key: "primary", imagePath: "/images/restaurant/hero/hero-01.webp" },
  { key: "secondary", imagePath: "/images/restaurant/hero/hero-02.webp" },
  { key: "gallery-0", imagePath: "/images/restaurant/gallery/gallery-01.webp" },
  { key: "gallery-1", imagePath: "/images/restaurant/gallery/gallery-02.webp" },
  { key: "gallery-2", imagePath: "/images/restaurant/gallery/gallery-03.webp" },
  { key: "gallery-3", imagePath: "/images/restaurant/gallery/gallery-04.webp" },
  { key: "team-0", imagePath: "/images/restaurant/about/about-01.webp" },
  { key: "team-1", imagePath: "/images/restaurant/about/about-02.webp" },
  { key: "team-2", imagePath: "/images/restaurant/about/about-03.webp" },
  { key: "menu-0", imagePath: "/images/restaurant/menu/menu-01.webp" },
  { key: "menu-1", imagePath: "/images/restaurant/menu/menu-02.webp" },
];

const CONTENT_BY_SECTION: Record<SectionType, Record<string, unknown>> = {
  header: {
    brandName: BRAND,
    tagline: "Wood-fired pizza and Roman pasta in Brooklyn",
    ctaLabel: "Reserve a Table",
    eyebrow: "Italian restaurant",
    navItems: NAV_ITEMS,
  },
  hero: {
    headline: BRAND,
    subheading:
      "Wood-fired Neapolitan pizza and Roman pasta, cooked the way Nonna taught us.",
    ctaLabel: "Reserve a Table",
    eyebrow: "Since 1974",
    badgeTitle: "Since",
    badgeScript: "1974",
  },
  about: {
    headline: "A Brooklyn table since 1974",
    body: "Nonna Rosa opened her first trattoria in Brooklyn in 1974, bringing her family's Neapolitan recipes across the Atlantic. The room is still small, the oven still wood-fired, and the Sunday gravy still simmers all afternoon.",
    ctaLabel: "Our Story",
  },
  menu: {
    sectionTitle: "From Our Kitchen",
    introText: "Seasonal plates, honest ingredients, and a few recipes that never leave the board.",
    items: [
      {
        name: "Margherita Pizza",
        price: 16,
        description: "San Marzano tomatoes, fresh mozzarella, basil",
      },
      {
        name: "Cacio e Pepe",
        price: 18,
        description: "Pecorino romano, cracked black pepper",
      },
      {
        name: "Branzino al Forno",
        price: 32,
        description: "Wood-roasted sea bass, lemon, olive oil, rosemary",
      },
      {
        name: "Tonnarelli al Tartufo",
        price: 28,
        description: "Hand-cut pasta, black truffle, butter, parmigiano",
      },
      {
        name: "Tiramisu",
        price: 9,
        description: "Espresso-soaked ladyfingers, mascarpone",
      },
    ],
  },
  services: {
    headline: "How We Host You",
    introText: "Dinner, celebrations, and a few things the neighborhood asks for by name.",
    items: [
      {
        title: "Walk-in dining",
        description: "A warm room for date nights and neighborhood regulars.",
      },
      {
        title: "Private tables",
        description: "Quiet corners for birthdays, proposals, and family feasts.",
      },
      {
        title: "Wine pairing",
        description: "Italian bottles chosen to sit beside the pasta, not on top of it.",
      },
      {
        title: "Takeaway",
        description: "The same wood-fired pies, boxed for the walk home.",
      },
    ],
  },
  stats: {
    headline: "Loved by the neighborhood",
    items: [
      { value: "1974", label: "Opened" },
      { value: "50+", label: "Seats" },
      { value: "12k", label: "Pizzas a year" },
      { value: "4.9", label: "Guest rating" },
    ],
  },
  gallery: {
    headline: "The Room & The Plate",
    caption: "Oven glow, marble counters, and the dishes that leave the pass every night.",
  },
  testimonials: {
    headline: "What guests tell us",
    introText: "A few notes from people who keep coming back for the cacio e pepe.",
    items: [
      {
        quote: "The margherita tastes like Naples and the room feels like a neighbor's kitchen.",
        name: "Elena Marchetti",
        role: "Regular, Carroll Gardens",
      },
      {
        quote: "We booked for an anniversary and they treated it like a family dinner.",
        name: "James Whitaker",
        role: "Guest",
      },
      {
        quote: "Best Roman pasta in Brooklyn. I still think about the tonnarelli.",
        name: "Priya Shah",
        role: "Food writer",
      },
    ],
  },
  team: {
    headline: "The people at the pass",
    introText: "A small brigade that still cooks like it's Nonna's Sunday.",
    members: [
      {
        name: "Rosa Benedetti",
        role: "Founder",
        bio: "Brought the family recipes from Naples in 1974 and still tastes the sauce.",
      },
      {
        name: "Marco Benedetti",
        role: "Head Chef",
        bio: "Runs the wood oven and the pasta board with the same stubborn patience.",
      },
      {
        name: "Giulia Ferraro",
        role: "Pasta Chef",
        bio: "Hand-cuts the tonnarelli and keeps the pecorino mountain honest.",
      },
    ],
  },
  reservation: {
    headline: "Reserve a table",
    body: "Walk-ins are welcome, but Friday and Saturday fill up. Tell us the occasion and we'll make room.",
    ctaLabel: "Book Now",
    phone: PHONE,
    address: ADDRESS,
  },
  location_map: {
    headline: "Find us in Brooklyn",
    directionsNote: "Two blocks from the Carroll Street F/G. Look for the red awning on Via Roma.",
    address: ADDRESS,
    phone: PHONE,
  },
  contact: {
    headline: "Plan your evening",
    body: "Share a date, party size, and any occasion notes. We'll make the table feel like yours.",
    address: ADDRESS,
    phone: PHONE,
    email: EMAIL,
    hours: HOURS,
    ctaLabel: "Request Reservation",
  },
  footer: {
    brandName: BRAND,
    headline: BRAND,
    tagline: "Wood-fired pizza, Roman pasta, Brooklyn hospitality.",
    body: "An intimate dining room for long conversations, wood-fired pies, and Sunday gravy that still simmers all afternoon.",
    copyright: `© ${new Date().getFullYear()} ${BRAND}. All rights reserved.`,
    address: ADDRESS,
    phone: PHONE,
    email: EMAIL,
    hours: HOURS,
    navItems: NAV_ITEMS,
  },
};

/**
 * Returns fixture copy for a section type so gallery previews look like a real site.
 */
export function galleryContentForSection(
  sectionType: SectionType,
): Record<string, unknown> {
  return CONTENT_BY_SECTION[sectionType];
}

/**
 * Returns catalog image assets used by gallery previews.
 */
export function galleryAssetsForSection(): PageAsset[] {
  return GALLERY_ASSETS;
}

/**
 * Builds a one-section Page JSON for isolated gallery preview.
 */
export function buildGalleryPage(componentId: string): Page | null {
  const parsed = parseGalleryComponentId(componentId);
  if (!parsed) return null;

  const section: PageSection = {
    type: parsed.sectionType,
    componentId,
    content: galleryContentForSection(parsed.sectionType),
    assets: galleryAssetsForSection(),
    layout: DEFAULT_SECTION_LAYOUT,
  };

  return { sections: [section] };
}
