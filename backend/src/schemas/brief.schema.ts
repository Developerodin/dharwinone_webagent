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

export const briefHoursSchema = z.object({
  days: z.string().min(1),
  open: z.string().min(1),
  close: z.string().min(1),
});

export const briefTestimonialSchema = z.object({
  quote: z.string().min(1),
  name: z.string().min(1),
  source: z.string().nullable(),
  role: z.string().nullable().optional(),
});

export const briefTeamMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  bio: z.string().nullable(),
});

export const briefSocialsSchema = z.object({
  instagram: z.string().nullable(),
  bookingUrl: z.string().nullable(),
});

export const briefSchema = z.object({
  businessName: z.string().min(1),
  category: z.string().min(1),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  /** Restaurant inbox for contact/reservation leads. Never invent. */
  email: z.string().nullable().optional(),
  /** Map pin from the location picker. Never invent. */
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  placeId: z.string().nullable().optional(),
  menuItems: z.array(menuItemSchema),
  photos: z.array(z.string()),
  /** Brand colors as names or hex; null = use theme defaults. */
  brandColors: z.array(z.string()).nullable(),

  // Positioning (drives copy quality)
  usp: z.string().nullable().default(null),
  story: z.string().nullable().default(null),
  foundedYear: z.number().int().nullable().default(null),
  signatureDishes: z.array(z.string()).default([]),
  audience: z.string().nullable().default(null),
  priceBand: z
    .enum(["budget", "mid", "premium", "fine_dining"])
    .nullable()
    .default(null),
  vibe: z.array(z.string()).default([]),

  // Real facts (kills fabrication)
  hours: z.array(briefHoursSchema).default([]),
  neighbourhood: z.string().nullable().default(null),
  awards: z.array(z.string()).default([]),
  testimonials: z.array(briefTestimonialSchema).default([]),
  team: z.array(briefTeamMemberSchema).default([]),
  dietary: z.array(z.string()).default([]),
  socials: briefSocialsSchema.nullable().default(null),
});

export type Brief = z.infer<typeof briefSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;

/**
 * Normalizes a parsed brief by converting nulls for app use.
 */
export function normalizeBrief(brief: Brief): Brief {
  return {
    ...brief,
    phone: brief.phone ?? null,
    address: brief.address ?? null,
    email: brief.email ?? null,
    lat: typeof brief.lat === "number" ? brief.lat : null,
    lng: typeof brief.lng === "number" ? brief.lng : null,
    placeId: brief.placeId ?? null,
    brandColors: brief.brandColors?.length ? brief.brandColors : null,
    usp: brief.usp ?? null,
    story: brief.story ?? null,
    foundedYear: brief.foundedYear ?? null,
    signatureDishes: brief.signatureDishes ?? [],
    audience: brief.audience ?? null,
    priceBand: brief.priceBand ?? null,
    vibe: brief.vibe ?? [],
    hours: brief.hours ?? [],
    neighbourhood: brief.neighbourhood ?? null,
    awards: brief.awards ?? [],
    testimonials: brief.testimonials ?? [],
    team: brief.team ?? [],
    dietary: brief.dietary ?? [],
    socials: brief.socials ?? null,
    menuItems: brief.menuItems.map((item) => ({
      ...item,
      description: item.description ?? null,
    })),
  };
}

/**
 * Coerces loose client payloads (older projects) into a Brief.
 */
export function coerceBriefInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const record = input as Record<string, unknown>;
  return {
    ...record,
    brandColors: record.brandColors ?? null,
    usp: record.usp ?? null,
    story: record.story ?? null,
    foundedYear: record.foundedYear ?? null,
    signatureDishes: Array.isArray(record.signatureDishes)
      ? record.signatureDishes
      : [],
    audience: record.audience ?? null,
    priceBand: record.priceBand ?? null,
    vibe: Array.isArray(record.vibe) ? record.vibe : [],
    hours: Array.isArray(record.hours) ? record.hours : [],
    neighbourhood: record.neighbourhood ?? null,
    awards: Array.isArray(record.awards) ? record.awards : [],
    testimonials: Array.isArray(record.testimonials) ? record.testimonials : [],
    team: Array.isArray(record.team) ? record.team : [],
    dietary: Array.isArray(record.dietary) ? record.dietary : [],
    socials: record.socials ?? null,
    photos: Array.isArray(record.photos) ? record.photos : [],
    menuItems: Array.isArray(record.menuItems) ? record.menuItems : [],
    email: record.email ?? null,
    lat: typeof record.lat === "number" ? record.lat : null,
    lng: typeof record.lng === "number" ? record.lng : null,
    placeId: record.placeId ?? null,
  };
}
