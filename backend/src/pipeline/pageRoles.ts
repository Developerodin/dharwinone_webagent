import type { SectionType } from "../schemas/page.schema.js";

/**
 * A page a generated site can contain.
 *
 * This table is *vertical data*, not engine logic. Another industry ships its
 * own table (Real Estate: listings / neighbourhoods / valuations; SaaS:
 * product / pricing / docs) and the site planner works unchanged.
 */
export type PageRoleSpec = {
  role: string;
  title: string;
  path: string;
  /** Words an owner uses when asking for this page. */
  keywords: RegExp;
  /** Sections that move onto this page when it exists. */
  sections: SectionType[];
  /** Ordering weight in the nav — lower comes first. */
  order: number;
  /** Never split this page off unless the owner named it. */
  requiresExplicitRequest?: boolean;
};

/** Page roles for the hospitality vertical (restaurants, cafes, bars). */
export const HOSPITALITY_PAGE_ROLES: readonly PageRoleSpec[] = [
  {
    role: "home",
    title: "Home",
    path: "/",
    keywords: /\b(home|landing|front\s*page)\b/,
    sections: [],
    order: 0,
  },
  {
    role: "menu",
    title: "Menu",
    path: "/menu",
    keywords: /\b(menu|menus|food|drinks|offerings|what\s*we\s*serve)\b/,
    sections: ["menu"],
    order: 1,
  },
  {
    role: "about",
    title: "About",
    path: "/about",
    keywords: /\b(about|our\s*story|story|who\s*we\s*are|history|team|chefs?)\b/,
    sections: ["about", "team", "stats"],
    order: 2,
  },
  {
    role: "services",
    title: "Private Dining",
    path: "/private-dining",
    keywords: /\b(private\s*dining|private\s*events?|events?|catering|functions|services)\b/,
    sections: ["services"],
    order: 3,
  },
  {
    role: "gallery",
    title: "Gallery",
    path: "/gallery",
    keywords: /\b(gallery|galleries|photos?|photography|images?|pictures?)\b/,
    sections: ["gallery"],
    order: 4,
  },
  {
    role: "contact",
    title: "Contact",
    path: "/contact",
    keywords: /\b(contact|find\s*us|visit|directions|location|book|reservations?)\b/,
    sections: ["contact", "location_map", "reservation"],
    order: 5,
  },
];

/**
 * Sections that stay on every page of a multi-page site.
 */
export const SHARED_PAGE_SECTIONS: SectionType[] = ["header", "footer"];

/**
 * Sections that always anchor the home page, whatever else moves off it.
 */
export const HOME_ANCHOR_SECTIONS: SectionType[] = ["hero"];

/**
 * Looks up a role spec by name.
 */
export function findPageRole(
  role: string,
  roles: readonly PageRoleSpec[] = HOSPITALITY_PAGE_ROLES,
): PageRoleSpec | null {
  return roles.find((spec) => spec.role === role) ?? null;
}
