import type { Brief } from "../schemas/brief.schema.js";

/**
 * Deterministic brief for fixture / token-free pipeline testing.
 */
export const FIXTURE_BRIEF: Brief = {
  businessName: "Nonna Rosa Trattoria",
  category: "Italian restaurant",
  phone: "(555) 234-8890",
  address: "42 Via Roma Street, Brooklyn, NY 11201",
  email: "reservations@nonnarosa.com",
  lat: 40.6782,
  lng: -73.9442,
  placeId: null,
  menuItems: [
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
      name: "Tiramisu",
      price: 9,
      description: "Espresso-soaked ladyfingers, mascarpone",
    },
  ],
  photos: [],
  brandColors: null,
  usp: "Wood-fired Neapolitan pizza and Roman pasta in Brooklyn",
  story: "Nonna Rosa opened her first trattoria in Brooklyn in 1974, bringing her family's Neapolitan recipes across the Atlantic.",
  foundedYear: 1974,
  signatureDishes: ["Margherita Pizza", "Cacio e Pepe"],
  audience: "date nights and neighborhood regulars",
  priceBand: "mid",
  vibe: ["cosy", "warm"],
  hours: [{ days: "Mon–Sun", open: "12:00", close: "22:00" }],
  neighbourhood: "Brooklyn",
  awards: [],
  testimonials: [],
  team: [],
  dietary: [],
  socials: null,
};
