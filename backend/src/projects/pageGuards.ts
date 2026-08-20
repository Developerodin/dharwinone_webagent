import { badRequest, payloadTooLarge } from "../lib/httpError.js";
import { LIMITS } from "../config/limits.js";
import { pageSchema, type Page } from "../schemas/page.schema.js";

/**
 * Validation applied to every page document before it is stored.
 *
 * The client is no longer the source of truth, so nothing reaches a
 * ProjectVersion row without passing through here.
 */

/**
 * Schemes that must never appear in a stored document.
 *
 * Deliberately unanchored. A start-anchored pattern only catches a value that
 * *is* the URL, and misses every way one can be embedded: `url(data:...)` in a
 * CSS string, a zero-width space or NUL before the scheme, an `srcset` entry,
 * a scheme buried mid-attribute. The scanner runs over every string in the
 * document, so matching anywhere is both cheap and correct.
 */
const FORBIDDEN_SCHEMES = /(data|javascript|vbscript)\s*:/i;

/**
 * Characters used to smuggle a scheme past a naive matcher.
 *
 * Zero-width spaces, NUL, and control characters are invisible in a rendered
 * page but ignored by URL parsers, so `data\u0000:` resolves as `data:`.
 */
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g;

/**
 * Values that refer to one of our own stored assets.
 *
 * Two shapes coexist: legacy local uploads served from /images/uploads, and
 * CDN URLs from object storage. Collecting only the first meant the refcount
 * never saw a single object-storage asset — and garbage collection would then
 * have deleted assets that live pages were still using.
 */
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
    // Strip invisibles before matching, or `data\u200b:` slips through.
    if (FORBIDDEN_SCHEMES.test(text.replace(INVISIBLE, ""))) {
      offender = path || "(root)";
    }
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

  const cdnBase = process.env.CDN_BASE_URL?.trim().replace(/\/+$/, "");

  forEachString(page, (text) => {
    if (ASSET_PATH.test(text)) found.add(text);
    else if (cdnBase && text.startsWith(cdnBase)) found.add(text);
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
