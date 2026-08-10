import type { Page, SectionType } from "@/types/page";

export type UploadableSection = Extract<
  SectionType,
  "hero" | "about" | "gallery" | "team" | "reservation"
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

/**
 * Uploads an image or video and patches the matching page asset slot.
 */
export async function uploadSectionImage(args: {
  file: File;
  page: Page;
  target: ImageUploadTarget;
}): Promise<{ page: Page; imagePath: string; mediaKind: "image" | "video" }> {
  if (!isMediaFile(args.file)) {
    throw new Error(
      "Please choose an image (jpg, png, webp) or video (mp4, webm, mov).",
    );
  }

  const video = isVideoFile(args.file);
  const maxBytes = video ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES;
  if (args.file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `${video ? "Video" : "Image"} is too large (${Math.round(args.file.size / (1024 * 1024))}MB). Max is ${limitMb}MB.`,
    );
  }

  const dataUrl = await fileToUploadDataUrl(args.file);

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
      section.type !== "reservation"
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
  return "About media";
}
