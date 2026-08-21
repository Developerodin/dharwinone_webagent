import { badRequest } from "../lib/httpError.js";

/**
 * Writing an uploaded asset into a page's section slots.
 *
 * Extracted from the route so the slot rules — which section grows, which one
 * replaces — can be tested without a database or an HTTP layer.
 */

type PageAsset = { key: string; imagePath: string };
type MediaSection = { type: string; assets: PageAsset[] };
type MediaPage = { sections: MediaSection[] };

/**
 * Picks the slot an upload should land in when the client did not name one.
 *
 * Gallery appends to the end; every other section has a single `primary` slot,
 * so a second upload replaces the first rather than accumulating orphans.
 */
export function resolveAssetKey(
  page: MediaPage,
  sectionType: string,
  requested?: string,
): string {
  if (requested) return requested;
  if (sectionType !== "gallery") return "primary";

  const gallery = page.sections.find((section) => section.type === "gallery");
  return `gallery-${gallery?.assets.length ?? 0}`;
}

/**
 * Writes an asset URL into a section's media slot, mutating the page.
 *
 * Mutation is deliberate: the caller has already parsed and owns the document,
 * and a copy here would only invite the two to drift apart.
 */
export function placeAsset(
  page: MediaPage,
  sectionType: string,
  assetKey: string,
  imagePath: string,
): void {
  const section = page.sections.find((item) => item.type === sectionType);

  if (!section) {
    throw badRequest(
      "SECTION_NOT_FOUND",
      `This page has no ${sectionType} section.`,
    );
  }

  const existing = section.assets.findIndex((asset) => asset.key === assetKey);

  if (existing >= 0) {
    section.assets[existing] = { key: assetKey, imagePath };
    return;
  }

  if (section.type === "gallery") {
    section.assets.push({ key: assetKey, imagePath });
    return;
  }

  section.assets = [{ key: assetKey || "primary", imagePath }];
}
