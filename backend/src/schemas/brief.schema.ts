import { z } from "zod";

/**
 * Minimum viable brief schema from the MVP spec.
 * Optional fields use .nullable() for OpenAI structured output compatibility.
 */
export const menuItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string().nullable(),
});

export const briefSchema = z.object({
  businessName: z.string().min(1),
  category: z.string().min(1),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  menuItems: z.array(menuItemSchema),
  photos: z.array(z.string()),
});

export type Brief = z.infer<typeof briefSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;

/**
 * Normalizes a parsed brief by converting nulls to undefined for app use.
 */
export function normalizeBrief(brief: Brief): Brief {
  return {
    ...brief,
    phone: brief.phone ?? null,
    address: brief.address ?? null,
    menuItems: brief.menuItems.map((item) => ({
      ...item,
      description: item.description ?? null,
    })),
  };
}
