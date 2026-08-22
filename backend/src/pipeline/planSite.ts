import type { Brief } from "../schemas/brief.schema.js";
import type { PagePlanItem, SitePlan } from "../schemas/creativeDirection.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import {
  HOME_ANCHOR_SECTIONS,
  HOSPITALITY_PAGE_ROLES,
  SHARED_PAGE_SECTIONS,
  type PageRoleSpec,
} from "./pageRoles.js";
import { classifySiteIntent } from "./siteIntent.js";

/** Sections a landing page keeps — everything else is noise for one CTA. */
const LANDING_SECTIONS: SectionType[] = [
  "header",
  "hero",
  "about",
  "menu",
  "gallery",
  "reservation",
  "contact",
  "footer",
];

/**
 * Teasers the home page keeps even when the full section moves to its own page,
 * so home still reads as a complete page rather than a hero and a footer.
 */
const MAX_HOME_TEASERS = 3;

/** Conversion section the home page closes on when one is available. */
const HOME_CLOSING_SECTIONS: SectionType[] = ["reservation", "contact"];

const HOME_TEASER_PRIORITY: SectionType[] = [
  "about",
  "gallery",
  "menu",
  "stats",
  "testimonials",
  "reservation",
];

export type PlanSiteArgs = {
  brief: Brief;
  chatText: string;
  /** Every section the section planner produced for this business. */
  sections: readonly SectionType[];
  roles?: readonly PageRoleSpec[];
};

/**
 * Orders a section list to match the planner's original order.
 */
function inPlannedOrder(
  sections: readonly SectionType[],
  wanted: readonly SectionType[],
): SectionType[] {
  return sections.filter((section) => wanted.includes(section));
}

/**
 * Wraps a page's body sections with the shared header and footer.
 */
function withShell(body: SectionType[]): SectionType[] {
  const inner = body.filter((section) => !SHARED_PAGE_SECTIONS.includes(section));
  return ["header", ...inner, "footer"];
}

/**
 * Plans the site's page structure.
 *
 * Single page and landing requests produce exactly one page, so nothing about
 * the existing behaviour changes for them. Multi-page requests distribute the
 * planned sections across pages by role, and keep a teaser of the strongest
 * moved section on home.
 */
export function planSite(args: PlanSiteArgs): SitePlan {
  const roles = args.roles ?? HOSPITALITY_PAGE_ROLES;
  const intent = classifySiteIntent({
    brief: args.brief,
    chatText: args.chatText,
    roles,
  });
  const sections = [...args.sections];

  if (intent.kind !== "multi_page") {
    const body =
      intent.kind === "landing"
        ? inPlannedOrder(sections, LANDING_SECTIONS)
        : sections;
    return {
      kind: intent.kind,
      reason: intent.reason,
      pages: [
        { role: "home", title: "Home", path: "/", sections: withShell(body) },
      ],
    };
  }

  // Only split off pages the owner asked for and that we have content for.
  const requested = new Set(intent.requestedRoles);
  const splittable = roles
    .filter((spec) => spec.role !== "home")
    .filter((spec) => spec.sections.some((section) => sections.includes(section)))
    .filter((spec) => (requested.size > 0 ? requested.has(spec.role) : true))
    .filter((spec) => !spec.requiresExplicitRequest || requested.has(spec.role))
    .sort((a, b) => a.order - b.order);

  // Not enough to split — a "multi-page" site with one real page is worse than
  // an honest single page.
  if (splittable.length < 2) {
    return {
      kind: "single_page",
      reason: `${intent.reason}, but only ${splittable.length} page(s) had content`,
      pages: [
        { role: "home", title: "Home", path: "/", sections: withShell(sections) },
      ],
    };
  }

  const claimed = new Set<SectionType>();
  const pages: PagePlanItem[] = [];

  for (const spec of splittable) {
    const body = inPlannedOrder(sections, spec.sections);
    if (body.length === 0) continue;
    for (const section of body) claimed.add(section);
    pages.push({
      role: spec.role,
      title: spec.title,
      path: spec.path,
      sections: withShell(body),
    });
  }

  // Home keeps the hero, everything nobody claimed, and one teaser so it still
  // has a middle.
  const homeBody = sections.filter(
    (section) =>
      HOME_ANCHOR_SECTIONS.includes(section) ||
      (!claimed.has(section) && !SHARED_PAGE_SECTIONS.includes(section)),
  );

  // Home teases the strongest moved sections so it reads as a designed page
  // rather than a hero bolted to a footer, and closes on a conversion band.
  const teasers = HOME_TEASER_PRIORITY.filter(
    (section) =>
      claimed.has(section) &&
      sections.includes(section) &&
      !homeBody.includes(section),
  ).slice(0, MAX_HOME_TEASERS);

  const heroAt = homeBody.indexOf("hero");
  homeBody.splice(heroAt + 1, 0, ...teasers);

  const closer = HOME_CLOSING_SECTIONS.find(
    (section) => sections.includes(section) && !homeBody.includes(section),
  );
  if (closer) homeBody.push(closer);

  return {
    kind: "multi_page",
    reason: intent.reason,
    pages: [
      { role: "home", title: "Home", path: "/", sections: withShell(homeBody) },
      ...pages,
    ],
  };
}
