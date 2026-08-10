import type { Brief } from "../schemas/brief.schema.js";

/**
 * Deterministic brief for fixture / token-free pipeline testing.
 */
export const FIXTURE_BRIEF: Brief = {
  businessName: "Nonna Rosa Trattoria",
  category: "Italian restaurant",
  phone: "(555) 234-8890",
  address: "42 Via Roma Street, Brooklyn, NY 11201",
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
};
