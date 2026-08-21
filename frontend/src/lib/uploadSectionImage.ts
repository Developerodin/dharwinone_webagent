import { ApiError } from "@/auth/types";
import type { Page, SectionType } from "@/types/page";
import { getAccessToken } from "@/lib/apiClient";
import { assetsEnabled, uploadAsset } from "@/lib/assetApi";
import { newIntentKey, placeServerMedia } from "@/lib/projectApi";

/**
 * Headers for a JSON request to an authenticated pipeline route.
 *
 * Used only by the legacy disk-upload fallback below; the object-storage path
 * sends the file straight to the bucket and never posts it here.
 */
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAccessToken() ?? ""}`,
  };
}

export type UploadableSection = Extract<
  SectionType,
  "hero" | "about" | "gallery" | "team" | "reservation" | "location_map"
>;

export type ImageUploadTarget = {
  section: UploadableSection;
  /** gallery-0, gallery-1, … or primary */
  assetKey: string;
};

/** Max decoded image size accepted by the API (25MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Max decoded video size accepted by the API (50MB). */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Downscale when larger than this so hero phone photos still upload. */
const DOWNSCALE_IF_OVER_BYTES = 3 * 1024 * 1024;
const MAX_EDGE_PX = 2400;
const JPEG_QUALITY = 0.88;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

/**
 * True when the file is a supported still image.
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

/**
 * True when the file is a supported video clip.
 */
export function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    file.type === "video/quicktime" ||
    VIDEO_EXT.test(file.name)
  );
}

/**
 * True when the file can replace a section asset (image or video).
 */
export function isMediaFile(file: File): boolean {
  return isImageFile(file) || isVideoFile(file);
}

/**
 * Reads a File into a data URL string.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales large photos via canvas so uploads stay under the body limit
 * without visibly wrecking quality for web heroes.
 */
async function prepareImageDataUrl(file: File): Promise<string> {
  const mime = file.type.toLowerCase();
  if (
    mime.includes("heic") ||
    mime.includes("heif") ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  ) {
    throw new Error(
      "HEIC/HEIF isn’t supported in the browser yet — export as JPG or PNG and retry.",
    );
  }

  if (file.size <= DOWNSCALE_IF_OVER_BYTES) {
    return readFileAsDataUrl(file);
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return readFileAsDataUrl(file);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const outputType =
      mime === "image/png" || mime === "image/webp" ? mime : "image/jpeg";
    const dataUrl = canvas.toDataURL(
      outputType,
      outputType === "image/jpeg" ? JPEG_QUALITY : undefined,
    );
    return dataUrl;
  } catch {
    return readFileAsDataUrl(file);
  }
}

/**
 * Builds a data-URL payload for upload (downscales large stills).
 */
export async function fileToUploadDataUrl(file: File): Promise<string> {
  return isVideoFile(file)
    ? readFileAsDataUrl(file)
    : prepareImageDataUrl(file);
}

export type SectionMediaResult = {
  page: Page;
  imagePath: string;
  mediaKind: "image" | "video";
  /** Set when the version was written server-side. */
  version?: number;
};

/**
 * Rejects a file that is the wrong type or over the size cap.
 *
 * Checked before a single byte moves: telling someone their 60 MB video is too
 * large after they have uploaded it wastes their bandwidth to report something
 * we already knew.
 */
function assertUploadable(file: File): void {
  if (!isMediaFile(file)) {
    throw new Error(
      "Please choose an image (jpg, png, webp) or video (mp4, webm, mov).",
    );
  }

  const video = isVideoFile(file);
  const maxBytes = video ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES;
  if (file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `${video ? "Video" : "Image"} is too large (${Math.round(file.size / (1024 * 1024))}MB). Max is ${limitMb}MB.`,
    );
  }
}

/**
 * Uploads a file and writes it into a section slot.
 *
 * Two paths, chosen by what the deployment supports:
 *
 *  1. Object storage — the file goes browser → bucket, then the server places
 *     the asset id into its own copy of the page and appends a version. The
 *     document never travels, and the asset is linked so garbage collection
 *     knows it is in use. This needs a project id, because there is no stored
 *     document to patch without one.
 *  2. Legacy disk upload — base64 through the API, page patched in the
 *     response. Still the only option for an unsaved project or a deployment
 *     with no bucket configured.
 */
export async function uploadSectionImage(args: {
  file: File;
  page: Page;
  target: ImageUploadTarget;
  /** Server project to write into. Absent for a page not yet saved. */
  projectId?: string | null;
  /** Version the client is editing from, for optimistic concurrency. */
  expectedVersion?: number;
  onProgress?: (fraction: number) => void;
}): Promise<SectionMediaResult> {
  assertUploadable(args.file);

  // The server path patches the *stored* document, so it needs one to exist.
  // A project with no version yet — created, but whose first build never
  // finished — still has to go through the legacy route, which patches the
  // page the client is holding.
  const hasStoredPage = (args.expectedVersion ?? 0) > 0;

  if (args.projectId && hasStoredPage && (await assetsEnabled())) {
    const asset = await uploadAsset(args.file, args.onProgress);
    return placeAssetInSection({
      assetId: asset.id,
      projectId: args.projectId,
      target: args.target,
      expectedVersion: args.expectedVersion ?? 0,
    });
  }

  return legacyUploadSectionImage(args);
}

/**
 * Writes an already-uploaded asset into a section slot, server-side.
 *
 * A version conflict is retried once against the new head. Placing a photo
 * does not depend on what the previous version said, so re-issuing it is the
 * honest resolution — unlike a whole-page save, where the client's copy really
 * has diverged and retrying would discard the other tab's work.
 */
export async function placeAssetInSection(args: {
  assetId: string;
  projectId: string;
  target: ImageUploadTarget;
  expectedVersion: number;
}): Promise<SectionMediaResult> {
  const intentKey = newIntentKey();

  const attempt = (expectedVersion: number) =>
    placeServerMedia({
      projectId: args.projectId,
      assetId: args.assetId,
      section: args.target.section,
      assetKey: args.target.assetKey,
      expectedVersion,
      idempotencyKey: intentKey,
    });

  let placed;
  try {
    placed = await attempt(args.expectedVersion);
  } catch (error) {
    const current =
      error instanceof ApiError && error.code === "VERSION_CONFLICT"
        ? error.details.currentVersion
        : undefined;

    if (typeof current !== "number") throw error;
    placed = await attempt(current);
  }

  return {
    page: placed.page,
    imagePath: placed.imagePath,
    mediaKind: placed.mediaKind,
    version: placed.version,
  };
}

/**
 * Writes a media URL into a section slot on a page the client holds.
 *
 * Mirrors the server's slot rules — gallery grows, everything else has one
 * `primary` slot — for the one case the server cannot handle: a project with
 * no stored document to patch. The caller commits the result as a version.
 */
export function placeMediaLocally(
  page: Page,
  target: ImageUploadTarget,
  imagePath: string,
): Page {
  const next = structuredClone(page);
  const section = next.sections.find((item) => item.type === target.section);

  if (!section) {
    throw new Error(`This page has no ${target.section} section.`);
  }

  const existing = section.assets.findIndex(
    (asset) => asset.key === target.assetKey,
  );

  if (existing >= 0) {
    section.assets[existing] = { key: target.assetKey, imagePath };
  } else if (section.type === "gallery") {
    section.assets.push({ key: target.assetKey, imagePath });
  } else {
    section.assets = [{ key: target.assetKey || "primary", imagePath }];
  }

  return next;
}

/**
 * Legacy disk upload: base64 through the API, page patched in the response.
 */
async function legacyUploadSectionImage(args: {
  file: File;
  page: Page;
  target: ImageUploadTarget;
}): Promise<SectionMediaResult> {
  const video = isVideoFile(args.file);
  const dataUrl = await fileToUploadDataUrl(args.file);

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      dataUrl,
      section: args.target.section,
      assetKey: args.target.assetKey,
      page: args.page,
    }),
  });

  let data: {
    ok?: boolean;
    page?: Page;
    imagePath?: string;
    mediaKind?: "image" | "video";
    error?: string;
  } = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error(
      response.status === 413
        ? "Media payload too large for the server — try a shorter / smaller file."
        : `Upload failed (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || !data.ok || !data.page || !data.imagePath) {
    throw new Error(data.error ?? `Upload failed (HTTP ${response.status}).`);
  }

  return {
    page: data.page,
    imagePath: data.imagePath,
    mediaKind: data.mediaKind ?? (video ? "video" : "image"),
  };
}

/**
 * Builds selectable upload targets from the current page sections.
 */
export function listImageUploadTargets(page: Page): ImageUploadTarget[] {
  const targets: ImageUploadTarget[] = [];

  for (const section of page.sections) {
    if (
      section.type !== "hero" &&
      section.type !== "about" &&
      section.type !== "gallery" &&
      section.type !== "team" &&
      section.type !== "reservation" &&
      section.type !== "location_map"
    ) {
      continue;
    }

    if (section.assets.length === 0) {
      targets.push({
        section: section.type,
        assetKey: section.type === "gallery" ? "gallery-0" : "primary",
      });
      continue;
    }

    for (const asset of section.assets) {
      targets.push({
        section: section.type,
        assetKey: asset.key,
      });
    }
  }

  return targets;
}

/**
 * Human label for an upload target.
 */
export function formatUploadTargetLabel(target: ImageUploadTarget): string {
  if (target.section === "gallery") {
    const index = target.assetKey.replace(/^gallery-/, "");
    return `Gallery media ${Number(index) + 1 || index}`;
  }
  if (target.section === "hero") return "Hero media";
  if (target.section === "team") return "Team media";
  if (target.section === "reservation") return "Reservation media";
  if (target.section === "location_map") return "Location map media";
  return "About media";
}
