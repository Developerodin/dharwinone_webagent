import type { Page } from "@/types/page";
import {
  fileToUploadDataUrl,
  isMediaFile,
  isVideoFile,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_BYTES,
  type ImageUploadTarget,
} from "@/lib/uploadSectionImage";

export type LibraryMediaItem = {
  imagePath: string;
  filename: string;
  mediaKind: "image" | "video";
  bytes: number;
  mtimeMs: number;
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
 * Parses JSON from an upload API response with a useful fallback error.
 */
async function readUploadJson(
  response: Response,
): Promise<UploadResponse> {
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
 * Lists images and videos already stored under /images/uploads.
 */
export async function listLibraryMedia(): Promise<LibraryMediaItem[]> {
  const response = await fetch("/api/upload");
  const data = await readUploadJson(response);
  if (!response.ok || !data.ok || !Array.isArray(data.items)) {
    throw new Error(data.error ?? `Could not load media (HTTP ${response.status}).`);
  }
  return data.items;
}

/**
 * Uploads a file into the shared media library without patching a page.
 */
export async function uploadToMediaLibrary(
  file: File,
): Promise<LibraryMediaItem> {
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

  const dataUrl = await fileToUploadDataUrl(file);
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const data = await readUploadJson(response);

  if (!response.ok || !data.ok || !data.imagePath) {
    throw new Error(data.error ?? `Upload failed (HTTP ${response.status}).`);
  }

  const mediaKind = data.mediaKind ?? (video ? "video" : "image");
  const filename = data.imagePath.split("/").pop() ?? file.name;

  return {
    imagePath: data.imagePath,
    filename,
    mediaKind,
    bytes: file.size,
    mtimeMs: Date.now(),
  };
}

/**
 * Applies a library media path to a page section asset slot.
 */
export async function applyLibraryMedia(args: {
  imagePath: string;
  page: Page;
  target: ImageUploadTarget;
}): Promise<{ page: Page; imagePath: string; mediaKind: "image" | "video" }> {
  const response = await fetch("/api/upload/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
