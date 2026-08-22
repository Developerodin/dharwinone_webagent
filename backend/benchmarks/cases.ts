import type { Brief } from "../src/schemas/brief.schema.js";

/**
 * One benchmark scenario: the prompt a real owner would type plus the brief
 * intake would have produced from it. Briefs are fixed so runs are comparable.
 */
export type BenchmarkCase = {
  /** Stable slug used for output filenames and baseline diffing. */
  id: string;
  label: string;
  /** What the business owner asked for, verbatim. */
  prompt: string;
  /** Pages the case expects. Single-page cases list only "home". */
  expectedPages: string[];
  brief: Brief;
};

/** Fields every benchmark brief shares so cases differ only where it matters. */
const BASE: Pick<
  Brief,
  | "photos" | "brandColors" | "awards" | "testimonials" | "team"
  | "dietary" | "socials" | "placeId" | "email"
> = {
  photos: [],
  brandColors: null,
  awards: [],
  testimonials: [],
  team: [],
  dietary: [],
  socials: null,
  placeId: null,
  email: null,
};

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    id: "modern-cafe",
    label: "Modern cafe",
    prompt:
      "I run a modern cafe called Rowan & Rye in Shoreditch. Bright, minimal space, "
      + "great filter coffee and a short all-day brunch menu. We want something clean and current.",
    expectedPages: ["home"],
    brief: {
      ...BASE,
      businessName: "Rowan & Rye",
      category: "Modern cafe",
      phone: "020 7946 0812",
      address: "18 Redchurch Street, Shoreditch, London E2 7DJ",
      lat: 51.5241,
      lng: -0.0754,
      menuItems: [
        { name: "Filter Coffee", price: 3, description: "Rotating single origin, V60" },
        { name: "Cardamom Bun", price: 4, description: "Baked each morning in-house" },
        { name: "Green Shakshuka", price: 11, description: "Spinach, feta, sourdough" },
        { name: "Cortado", price: 3, description: "Double shot, whole milk" },
      ],
      usp: "Rotating single-origin filter and an all-day brunch menu that stays short",
      story: null,
      foundedYear: 2019,
      signatureDishes: ["Cardamom Bun", "Green Shakshuka"],
      audience: "freelancers and weekend brunch regulars",
      priceBand: "mid",
      vibe: ["bright", "minimal", "calm"],
      hours: [{ days: "Mon–Sun", open: "07:30", close: "16:00" }],
      neighbourhood: "Shoreditch",
    },
  },
  {
    id: "luxury-restaurant",
    label: "Luxury restaurant",
    prompt:
      "Maison Verre is a luxury contemporary French restaurant in Mayfair. Tasting menu only, "
      + "candlelit dining room, sommelier-led pairings. The site should feel restrained and expensive.",
    expectedPages: ["home"],
    brief: {
      ...BASE,
      businessName: "Maison Verre",
      category: "Luxury contemporary French",
      phone: "020 7499 3311",
      address: "9 Mount Street, Mayfair, London W1K 3NG",
      lat: 51.5104,
      lng: -0.1503,
      menuItems: [
        { name: "Turbot, Vin Jaune", price: 48, description: "Aged turbot, Jura reduction" },
        { name: "Pigeon de Bresse", price: 52, description: "Cherry, fermented pepper" },
        { name: "Tarte aux Pommes", price: 22, description: "Caramelised over 12 hours" },
      ],
      usp: "A nine-course tasting menu built around one delivery of fish each morning",
      story:
        "Chef-owner Elise Marchand opened Maison Verre in 2016 after eleven years cooking in Lyon.",
      foundedYear: 2016,
      signatureDishes: ["Turbot, Vin Jaune", "Pigeon de Bresse"],
      audience: "anniversary dinners and considered occasions",
      priceBand: "fine_dining",
      vibe: ["restrained", "candlelit", "precise"],
      hours: [{ days: "Tue–Sat", open: "18:30", close: "23:00" }],
      neighbourhood: "Mayfair",
    },
  },
  {
    id: "casual-restaurant",
    label: "Casual restaurant",
    prompt:
      "Nonna Lucia is our family trattoria in Brooklyn. Nothing fancy — wood-fired pizza, "
      + "Roman pasta, loud dining room, families and regulars. Warm and welcoming.",
    expectedPages: ["home"],
    brief: {
      ...BASE,
      businessName: "Nonna Lucia",
      category: "Casual Italian trattoria",
      phone: "(718) 555-0142",
      address: "42 Via Roma Street, Brooklyn, NY 11201",
      lat: 40.6782,
      lng: -73.9442,
      menuItems: [
        { name: "Margherita", price: 16, description: "San Marzano, fior di latte, basil" },
        { name: "Cacio e Pepe", price: 18, description: "Pecorino romano, cracked pepper" },
        { name: "Polpette della Nonna", price: 14, description: "Beef and pork, Sunday gravy" },
        { name: "Tiramisu", price: 9, description: "Espresso-soaked, made daily" },
      ],
      usp: "Wood-fired Neapolitan pizza and Roman pasta, same two ovens since 1974",
      story:
        "Nonna Lucia opened the first dining room on Via Roma Street in 1974 with her family's Neapolitan recipes.",
      foundedYear: 1974,
      signatureDishes: ["Margherita", "Cacio e Pepe"],
      audience: "neighbourhood families and Sunday regulars",
      priceBand: "mid",
      vibe: ["warm", "loud", "family"],
      hours: [{ days: "Mon–Sun", open: "12:00", close: "22:00" }],
      neighbourhood: "Brooklyn",
    },
  },
  {
    id: "fine-dining",
    label: "Fine dining restaurant",
    prompt:
      "Kaiseki Mori — a twelve-seat counter in Kyoto style. Omakase only, reservation by phone. "
      + "Quiet, spare, seasonal. Please keep the website extremely simple.",
    expectedPages: ["home"],
    brief: {
      ...BASE,
      businessName: "Kaiseki Mori",
      category: "Japanese kaiseki fine dining",
      phone: "(415) 555-0198",
      address: "1180 Sutter Street, San Francisco, CA 94109",
      lat: 37.7876,
      lng: -122.4204,
      menuItems: [
        { name: "Hassun", price: 0, description: "Eight seasonal bites" },
        { name: "Wanmono", price: 0, description: "Clear dashi, seasonal fish" },
        { name: "Yakimono", price: 0, description: "Charcoal-grilled, binchotan" },
      ],
      usp: "A twelve-seat counter serving one omakase, changed with the season",
      story: null,
      foundedYear: 2021,
      signatureDishes: ["Hassun", "Wanmono"],
      audience: "guests who book a single seating months ahead",
      priceBand: "fine_dining",
      vibe: ["quiet", "spare", "seasonal"],
      hours: [{ days: "Wed–Sun", open: "18:00", close: "21:00" }],
      neighbourhood: "Lower Nob Hill",
    },
  },
  {
    id: "bakery",
    label: "Bakery",
    prompt:
      "Flour & Salt is a sourdough bakery and pastry counter. We bake overnight, sell out by 2pm, "
      + "and do wholesale for a few local cafes. Honest, hand-made feeling.",
    expectedPages: ["home"],
    brief: {
      ...BASE,
      businessName: "Flour & Salt",
      category: "Artisan sourdough bakery",
      phone: "(503) 555-0177",
      address: "820 SE Belmont Street, Portland, OR 97214",
      lat: 45.5163,
      lng: -122.6544,
      menuItems: [
        { name: "Country Sourdough", price: 8, description: "48-hour levain, stone-milled wheat" },
        { name: "Kouign-Amann", price: 5, description: "Laminated over two days" },
        { name: "Seeded Rye", price: 9, description: "Caraway, sunflower, flax" },
        { name: "Morning Bun", price: 4, description: "Orange zest, cardamom sugar" },
      ],
      usp: "Everything is mixed the night before and sold the morning it is baked",
      story:
        "Flour & Salt started as a Saturday market stall in 2017 and moved to Belmont Street two years later.",
      foundedYear: 2017,
      signatureDishes: ["Country Sourdough", "Kouign-Amann"],
      audience: "neighbours who queue before work and wholesale cafe accounts",
      priceBand: "budget",
      vibe: ["honest", "hand-made", "early"],
      hours: [{ days: "Wed–Sun", open: "07:00", close: "14:00" }],
      neighbourhood: "Belmont",
    },
  },
  {
    id: "coffee-shop",
    label: "Coffee shop",
    prompt:
      "The Daily Grind, a neighbourhood coffee shop. Espresso, pour-over, a couple of pastries. "
      + "Regulars know us by name. Nothing pretentious.",
    expectedPages: ["home"],
    brief: {
      ...BASE,
      businessName: "The Daily Grind",
      category: "Neighbourhood coffee shop",
      phone: "(206) 555-0164",
      address: "1412 Pine Street, Seattle, WA 98101",
      lat: 47.6145,
      lng: -122.3283,
      menuItems: [
        { name: "Espresso", price: 3, description: "House blend, pulled short" },
        { name: "Pour Over", price: 5, description: "Changed weekly" },
        { name: "Oat Flat White", price: 5, description: "Double shot" },
      ],
      usp: "One espresso blend, roasted eight miles away, pulled the same way every day",
      story: null,
      foundedYear: 2014,
      signatureDishes: ["Pour Over"],
      audience: "regulars who come in before eight",
      priceBand: "budget",
      vibe: ["unpretentious", "neighbourhood", "steady"],
      hours: [{ days: "Mon–Fri", open: "06:30", close: "17:00" }],
      neighbourhood: "Capitol Hill",
    },
  },
  {
    id: "multi-page-restaurant",
    label: "Multi-page restaurant",
    prompt:
      "Harbour & Vine is a coastal seafood restaurant with a private events room. We need a proper "
      + "multi-page site: home, about, menu, private dining, gallery and contact.",
    expectedPages: ["home", "about", "menu", "services", "gallery", "contact"],
    brief: {
      ...BASE,
      businessName: "Harbour & Vine",
      category: "Coastal seafood restaurant",
      phone: "(207) 555-0133",
      address: "3 Commercial Wharf, Portland, ME 04101",
      lat: 43.6567,
      lng: -70.2481,
      menuItems: [
        { name: "Day Boat Halibut", price: 34, description: "Landed at the wharf that morning" },
        { name: "Lobster Roll", price: 28, description: "Warm butter, split-top brioche" },
        { name: "Oysters", price: 3, description: "Casco Bay, by the piece" },
        { name: "Clam Chowder", price: 12, description: "Salt pork, Maine potatoes" },
      ],
      usp: "Everything on the raw bar was landed at the wharf the restaurant sits on",
      story:
        "Harbour & Vine took over a former ships chandlery on Commercial Wharf in 2011.",
      foundedYear: 2011,
      signatureDishes: ["Day Boat Halibut", "Lobster Roll"],
      audience: "visitors on the waterfront and private event bookers",
      priceBand: "premium",
      vibe: ["coastal", "airy", "maritime"],
      hours: [{ days: "Tue–Sun", open: "11:30", close: "21:30" }],
      neighbourhood: "Old Port",
    },
  },
];
