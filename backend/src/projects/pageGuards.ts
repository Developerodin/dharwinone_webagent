import { badRequest, payloadTooLarge } from "../lib/httpError.js";
import { LIMITS } from "../config/limits.js";
import { pageSchema, type Page } from "../schemas/page.schema.js";

/**
 * Validation applied to every page document before it is stored.
 *
 * The client is no longer the source of truth, so nothing reaches a
 * ProjectVersion row without passing through here.
 */

/** Schemes that must never appear in a stored document. */
const FORBIDDEN_SCHEMES = /^\s*(data|javascript|vbscript):/i;

/** Paths we recognise as referring to one of our own assets. */
const ASSET_PATH = /^\/images\/uploads\//;

/**
 * Walks every string in a JSON value.
 *
 * Pages carry free-form `content` records per section, so a forbidden URL can
 * appear anywhere — checking only `assets[].imagePath` would miss a data URL
 * dropped into a hero background field.
 */
function forEachString(
  value: unknown,
  visit: (text: string, path: string) => void,
  path = "",
): void {
  if (typeof value === "string") {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => forEachString(item, visit, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      forEachString(child, visit, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * Rejects a page containing an embedded or executable URL.
 *
 * This is the single most important guard on the versions table. Assets are
 * stored as paths, so a document is tens of kilobytes; one base64 hero turns it
 * into megabytes, and because versions are immutable snapshots that bloat is
 * then copied into every subsequent version of the project.
 */
export function assertNoDataUrls(page: unknown): void {
  let offender: string | null = null;

  forEachString(page, (text, path) => {
    if (offender) return;
    if (FORBIDDEN_SCHEMES.test(text)) offender = path || "(root)";
  });

  if (offender) {
    throw badRequest(
      "DATA_URL_REJECTED",
      "Images must be uploaded as assets, not embedded in the page.",
      { field: offender },
    );
  }
}

/**
 * Rejects a page over the configured size cap.
 */
export function assertPageSize(page: unknown): number {
  const bytes = Buffer.byteLength(JSON.stringify(page ?? null), "utf8");

  if (bytes > LIMITS.maxPageBytes) {
    throw payloadTooLarge(
      "PAGE_TOO_LARGE",
      "This page is too large to save. Try removing some sections.",
      { bytes, limit: LIMITS.maxPageBytes },
    );
  }

  return bytes;
}

export type ValidatedPage = {
  page: Page;
  sizeBytes: number;
};

/**
 * Runs every guard and returns the parsed page with its stored size.
 *
 * Order matters: size first (cheapest, and bounds the work the others do),
 * then scheme scanning, then schema parsing.
 */
export function validatePage(input: unknown): ValidatedPage {
  const sizeBytes = assertPageSize(input);
  assertNoDataUrls(input);

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest("INVALID_PAGE", "That page could not be saved.", {
      issues: parsed.error.issues.slice(0, 5).map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return { page: parsed.data, sizeBytes };
}

/**
 * Collects every asset path a page references.
 *
 * Used to maintain the ProjectAsset refcount. Scans the whole document rather
 * than just `assets[]` because section content can also point at an upload.
 */
export function extractAssetPaths(page: unknown): string[] {
  const found = new Set<string>();

  forEachString(page, (text) => {
    if (ASSET_PATH.test(text)) found.add(text);
  });

  return [...found];
}

/**
 * Derives a display name for a project from its brief or hero headline.
 *
 * Moved server-side from the client so the dashboard, the project list, and
 * the published site cannot disagree about what a project is called.
 */
export function resolveProjectName(
  brief: unknown,
  page: unknown,
): string {
  const briefName = (brief as { businessName?: unknown } | null)?.businessName;
  if (typeof briefName === "string" && briefName.trim()) {
    return briefName.trim().slice(0, 120);
  }

  const sections = (page as { sections?: unknown } | null)?.sections;
  if (Array.isArray(sections)) {
    const hero = sections.find(
      (section) => (section as { type?: unknown })?.type === "hero",
    ) as { content?: { headline?: unknown } } | undefined;
    const headline = hero?.content?.headline;
    if (typeof headline === "string" && headline.trim()) {
      return headline.trim().slice(0, 120);
    }
  }

  return "Untitled project";
}
