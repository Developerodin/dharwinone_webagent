import { getAccessToken } from "@/lib/apiClient";
import type { Page } from "@/types/page";
import {
  assetsEnabled,
  listAssets,
  uploadAsset,
  type ServerAsset,
} from "@/lib/assetApi";
import {
  fileToUploadDataUrl,
  isMediaFile,
  isVideoFile,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_BYTES,
  placeAssetInSection,
  placeMediaLocally,
  type ImageUploadTarget,
  type SectionMediaResult,
} from "@/lib/uploadSectionImage";

/**
 * The user's media library.
 *
 * Backed by object storage where it is configured — each item is an `Asset`
 * row with a CDN URL — and by the legacy on-disk uploads directory otherwise,
 * so a deployment without a bucket keeps working.
 */

/**
 * Bearer header for the legacy disk-backed routes.
 */
function bearer(): Record<string, string> {
  return { Authorization: `Bearer ${getAccessToken() ?? ""}` };
}

export type LibraryMediaItem = {
  imagePath: string;
  filename: string;
  mediaKind: "image" | "video";
  bytes: number;
  mtimeMs: number;
  /**
   * Set for object-storage items.
   *
   * Its presence is what lets a placement send an id instead of a page: an
   * item with no id predates storage and has to go through the legacy apply.
   */
  assetId?: string;
  /** Placeholder gradient, so a slow photo does not flash empty. */
  blurhash?: string | null;
};

type UploadResponse = {
  ok?: boolean;
  page?: Page;
  imagePath?: string;
  mediaKind?: "image" | "video";
  error?: string;
  items?: LibraryMediaItem[];
};

/**
 * Converts a stored asset into a library row.
 */
function toLibraryItem(asset: ServerAsset): LibraryMediaItem {
  return {
    imagePath: asset.url,
    filename: asset.url.split("/").pop() ?? "upload",
    mediaKind: asset.kind === "VIDEO" ? "video" : "image",
    bytes: asset.bytes,
    mtimeMs: Date.parse(asset.createdAt) || Date.now(),
    assetId: asset.id,
    blurhash: asset.blurhash,
  };
}

/**
 * Parses JSON from a legacy upload response with a useful fallback error.
 */
async function readUploadJson(response: Response): Promise<UploadResponse> {
  try {
    return (await response.json()) as UploadResponse;
  } catch {
    throw new Error(
      response.status === 413
        ? "Media payload too large for the server — try a shorter / smaller file."
        : `Upload failed (HTTP ${response.status}).`,
    );
  }
}

/**
 * Rejects a file that is the wrong type or over the size cap.
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
 * Lists the user's stored media, newest first.
 */
export async function listLibraryMedia(): Promise<LibraryMediaItem[]> {
  if (await assetsEnabled()) {
    const assets = await listAssets(60);
    return assets.map(toLibraryItem);
  }

  const response = await fetch("/api/upload", { headers: bearer() });
  const data = await readUploadJson(response);
  if (!response.ok || !data.ok || !Array.isArray(data.items)) {
    throw new Error(
      data.error ?? `Could not load media (HTTP ${response.status}).`,
    );
  }
  return data.items;
}

/**
 * Uploads a file into the library without placing it on a page.
 */
export async function uploadToMediaLibrary(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<LibraryMediaItem> {
  assertUploadable(file);

  if (await assetsEnabled()) {
    return toLibraryItem(await uploadAsset(file, onProgress));
  }

  const dataUrl = await fileToUploadDataUrl(file);
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify({ dataUrl }),
  });
  const data = await readUploadJson(response);

  if (!response.ok || !data.ok || !data.imagePath) {
    throw new Error(data.error ?? `Upload failed (HTTP ${response.status}).`);
  }

  return {
    imagePath: data.imagePath,
    filename: data.imagePath.split("/").pop() ?? file.name,
    mediaKind: data.mediaKind ?? (isVideoFile(file) ? "video" : "image"),
    bytes: file.size,
    mtimeMs: Date.now(),
  };
}

/**
 * Places a library item into a section slot.
 *
 * With an asset id and a saved project the server does the placement against
 * its own document; otherwise the legacy route patches the page the client
 * sends and the caller commits the result as a version.
 */
export async function applyLibraryMedia(args: {
  imagePath: string;
  assetId?: string;
  page: Page;
  target: ImageUploadTarget;
  projectId?: string | null;
  expectedVersion?: number;
}): Promise<SectionMediaResult> {
  // Same requirement as a fresh upload: server-side placement patches the
  // stored document, so there has to be one.
  if (args.assetId && args.projectId && (args.expectedVersion ?? 0) > 0) {
    return placeAssetInSection({
      assetId: args.assetId,
      projectId: args.projectId,
      target: args.target,
      expectedVersion: args.expectedVersion ?? 0,
    });
  }

  // A stored asset with nowhere on the server to put it yet. The legacy apply
  // route only accepts on-disk `/images/uploads/...` paths, so it would reject
  // a CDN URL outright; patching here keeps the case working, and the caller
  // saves the result as the project's first version.
  if (args.assetId) {
    const page = placeMediaLocally(args.page, args.target, args.imagePath);
    return {
      page,
      imagePath: args.imagePath,
      mediaKind: /\.(mp4|webm|mov|ogg)(?:\?|#|$)/i.test(args.imagePath)
        ? "video"
        : "image",
    };
  }

  const response = await fetch("/api/upload/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify({
      imagePath: args.imagePath,
      section: args.target.section,
      assetKey: args.target.assetKey,
      page: args.page,
    }),
  });
  const data = await readUploadJson(response);

  if (!response.ok || !data.ok || !data.page || !data.imagePath) {
    throw new Error(data.error ?? `Apply failed (HTTP ${response.status}).`);
  }

  return {
    page: data.page,
    imagePath: data.imagePath,
    mediaKind: data.mediaKind ?? "image",
  };
}
