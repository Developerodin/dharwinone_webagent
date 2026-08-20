import { badRequest } from "../lib/httpError.js";
import { LIMITS } from "../config/limits.js";

/**
 * Accepted upload types.
 *
 * An allowlist, not a blocklist. SVG is deliberately absent: it is an
 * executable document, and serving user-supplied SVG lets an attacker run
 * script in whatever origin the asset is served from.
 */
const IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const VIDEO_MIMES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
};

export type MediaKind = "IMAGE" | "VIDEO";

export type MediaType = {
  kind: MediaKind;
  extension: string;
  maxBytes: number;
};

/**
 * Resolves a declared MIME type, or throws when it is not accepted.
 */
export function resolveMediaType(mime: string): MediaType {
  const normalized = mime.trim().toLowerCase();

  const imageExt = IMAGE_MIMES[normalized];
  if (imageExt) {
    return {
      kind: "IMAGE",
      extension: imageExt,
      maxBytes: LIMITS.maxImageBytes,
    };
  }

  const videoExt = VIDEO_MIMES[normalized];
  if (videoExt) {
    return {
      kind: "VIDEO",
      extension: videoExt,
      maxBytes: LIMITS.maxVideoBytes,
    };
  }

  throw badRequest(
    "UNSUPPORTED_MEDIA_TYPE",
    "That file type isn't supported. Try a JPEG, PNG, WebP or MP4.",
    { mime: normalized },
  );
}

/**
 * Identifies a file from its leading bytes.
 *
 * The browser's declared Content-Type is attacker-controlled. After upload we
 * check the actual magic bytes, so a PHP script announced as image/jpeg is
 * caught before anything links to it.
 */
export function sniffMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  // GIF87a / GIF89a
  if (buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return "image/gif";
  }

  // RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  // ISO base media: ....ftyp<brand>
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) {
      return "image/avif";
    }
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }

  // EBML header shared by WebM and Matroska
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "video/webm";
  }

  return null;
}
