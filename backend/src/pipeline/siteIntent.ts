import type { Brief } from "../schemas/brief.schema.js";
import type { SiteKind } from "../schemas/creativeDirection.schema.js";
import {
  HOSPITALITY_PAGE_ROLES,
  type PageRoleSpec,
} from "./pageRoles.js";

/** Phrases that mean "give me separate pages". */
const MULTI_PAGE_RE =
  /\b(multi[\s-]?page|multiple\s*pages|separate\s*pages|several\s*pages|full\s*website|proper\s*website|each\s*page|different\s*pages|pages\s*(for|like|:)|with\s*pages)\b/;

/** Phrases that mean "keep it to one scrolling page". */
const SINGLE_PAGE_RE =
  /\b(single[\s-]?page|one[\s-]?page|one\s*pager|scrolling\s*(site|page)|all\s*on\s*one\s*page)\b/;

/** Phrases that mean "a focused conversion page, not a website". */
const LANDING_RE =
  /\b(landing\s*page|coming\s*soon|campaign\s*page|pre[\s-]?launch|teaser\s*page|splash\s*page)\b/;

/** A list like "home, menu, about and contact". */
const PAGE_LIST_RE =
  /\b(pages?|sections?|tabs?)\b[^.!?]{0,80}?\b(home|about|menu|gallery|contact|services?|events?)\b/;

export type SiteIntent = {
  kind: SiteKind;
  /** Roles the owner explicitly named, in the order they named them. */
  requestedRoles: string[];
  /** Why the classifier decided this, for the trace. */
  reason: string;
};

/**
 * Finds page roles the owner named, preserving the order they listed them in.
 */
export function extractRequestedRoles(
  text: string,
  roles: readonly PageRoleSpec[] = HOSPITALITY_PAGE_ROLES,
): string[] {
  const lower = text.toLowerCase();
  const found: Array<{ role: string; at: number }> = [];

  for (const spec of roles) {
    const match = spec.keywords.exec(lower);
    if (match) found.push({ role: spec.role, at: match.index });
  }

  return found
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.role);
}

/**
 * Decides whether the request describes a landing page, a single scrolling
 * page, or a real multi-page site.
 *
 * Default is single page: most small venues want one scrolling page, and
 * silently promoting every brief to multi-page would be worse than the bug it
 * replaces. Multi-page requires the owner to actually ask for it — either by
 * naming the shape ("multi-page", "full website") or by listing pages.
 */
export function classifySiteIntent(args: {
  brief: Brief;
  chatText: string;
  roles?: readonly PageRoleSpec[];
}): SiteIntent {
  const roles = args.roles ?? HOSPITALITY_PAGE_ROLES;
  const corpus = `${args.chatText} ${args.brief.usp ?? ""}`.toLowerCase();
  const requestedRoles = extractRequestedRoles(corpus, roles);
  const namedPages = requestedRoles.filter((role) => role !== "home");

  if (LANDING_RE.test(corpus)) {
    return { kind: "landing", requestedRoles, reason: "asked for a landing page" };
  }

  if (SINGLE_PAGE_RE.test(corpus)) {
    return {
      kind: "single_page",
      requestedRoles,
      reason: "asked for a single scrolling page",
    };
  }

  if (MULTI_PAGE_RE.test(corpus)) {
    return {
      kind: "multi_page",
      requestedRoles,
      reason: "asked for a multi-page site",
    };
  }

  // A list of three or more distinct pages is a multi-page request even when
  // the words "multi-page" never appear.
  if (PAGE_LIST_RE.test(corpus) && namedPages.length >= 3) {
    return {
      kind: "multi_page",
      requestedRoles,
      reason: `listed ${namedPages.length} pages`,
    };
  }

  return {
    kind: "single_page",
    requestedRoles,
    reason: "no page structure requested — defaulting to one scrolling page",
  };
}
