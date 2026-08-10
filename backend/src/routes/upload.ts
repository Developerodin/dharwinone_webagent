import { randomUUID } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { z } from "zod";
import { pageSchema, type Page } from "../schemas/page.schema.js";

export const uploadRouter = Router();

const UPLOAD_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/images/uploads",
);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/ogg": ".ogg",
};

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".ogg"]);

/** Max decoded image bytes (25MB) — high-quality phone / DSLR heroes. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
/** Max decoded video bytes (50MB) — short section loops via data-URL. */
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Returns whether a mime type is a supported video.
 */
function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

/**
 * Returns media kind for a stored upload filename, or null if unsupported.
 */
function mediaKindFromFilename(
  filename: string,
): "image" | "video" | null {
  const ext = extname(filename).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  return null;
}

/**
 * True when path is a file under /images/uploads/.
 */
function isUploadedMediaPath(imagePath: string): boolean {
  if (!imagePath.startsWith("/images/uploads/")) return false;
  const name = basename(imagePath);
  return name.length > 0 && !name.includes("..") && name === imagePath.slice("/images/uploads/".length);
}

const sectionEnum = z.enum([
  "hero",
  "menu",
  "about",
  "gallery",
  "location_map",
  "services",
  "stats",
  "testimonials",
  "team",
  "reservation",
]);

const uploadBodySchema = z.object({
  dataUrl: z.string().min(32),
  section: sectionEnum.optional(),
  assetKey: z.string().min(1).optional(),
  page: pageSchema.optional(),
});

const applyBodySchema = z.object({
  imagePath: z.string().min(8),
  section: sectionEnum,
  assetKey: z.string().min(1).optional(),
  page: pageSchema,
});

/**
 * Parses a data-URL into mime + buffer.
 */
function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match?.[1] || !match[2]) {
    throw new Error("Invalid data URL — expected data:<mime>;base64,...");
  }
  const mime = match[1].toLowerCase().split(";")[0]?.trim() ?? "";
  if (mime.includes("heic") || mime.includes("heif")) {
    throw new Error(
      "HEIC/HEIF isn’t supported yet — export as JPG or PNG and retry.",
    );
  }
  if (!MIME_EXT[mime]) {
    throw new Error(
      `Unsupported media type: ${mime || "unknown"}. Use jpg, png, webp, mp4, webm, or mov.`,
    );
  }
  return { mime, buffer: Buffer.from(match[2], "base64") };
}

/**
 * Writes an uploaded media path into a page section asset slot.
 */
function applyUploadToPage(
  page: Page,
  sectionType: string,
  assetKey: string,
  imagePath: string,
): Page {
  const next = structuredClone(page);
  const section = next.sections.find((item) => item.type === sectionType);
  if (!section) {
    throw new Error(`No ${sectionType} section on this page.`);
  }

  const existing = section.assets.findIndex((asset) => asset.key === assetKey);
  if (existing >= 0) {
    section.assets[existing] = { key: assetKey, imagePath };
  } else if (section.type === "gallery") {
    section.assets.push({ key: assetKey, imagePath });
  } else {
    section.assets = [{ key: assetKey || "primary", imagePath }];
  }

  return next;
}

/**
 * Lists previously uploaded images and videos under /images/uploads.
 */
uploadRouter.get("/", async (_req, res) => {
  try {
    await mkdir(UPLOAD_ROOT, { recursive: true });
    const entries = await readdir(UPLOAD_ROOT);
    const items: Array<{
      imagePath: string;
      filename: string;
      mediaKind: "image" | "video";
      bytes: number;
      mtimeMs: number;
    }> = [];

    for (const filename of entries) {
      if (filename.startsWith(".")) continue;
      const mediaKind = mediaKindFromFilename(filename);
      if (!mediaKind) continue;
      const fullPath = join(UPLOAD_ROOT, filename);
      try {
        const info = await stat(fullPath);
        if (!info.isFile()) continue;
        items.push({
          imagePath: `/images/uploads/${filename}`,
          filename,
          mediaKind,
          bytes: info.size,
          mtimeMs: info.mtimeMs,
        });
      } catch {
        // Skip unreadable entries.
      }
    }

    items.sort((a, b) => b.mtimeMs - a.mtimeMs);
    res.status(200).json({ ok: true, items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown list error";
    console.error("[upload:list]", message);
    res.status(500).json({ ok: false, error: message });
  }
});

/**
 * Applies an already-uploaded media path to a page section asset slot.
 */
uploadRouter.post("/apply", async (req, res) => {
  try {
    const parsed = applyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Invalid apply payload." });
      return;
    }

    const { imagePath, section, assetKey, page } = parsed.data;
    if (!isUploadedMediaPath(imagePath)) {
      res.status(400).json({
        ok: false,
        error: "Only media from /images/uploads can be applied.",
      });
      return;
    }

    const filename = basename(imagePath);
    const mediaKind = mediaKindFromFilename(filename);
    if (!mediaKind) {
      res.status(400).json({ ok: false, error: "Unsupported media file." });
      return;
    }

    try {
      await stat(join(UPLOAD_ROOT, filename));
    } catch {
      res.status(404).json({ ok: false, error: "Media file not found." });
      return;
    }

    const updatedPage = applyUploadToPage(
      page,
      section,
      assetKey ??
        (section === "gallery"
          ? `gallery-${page.sections.find((s) => s.type === "gallery")?.assets.length ?? 0}`
          : "primary"),
      imagePath,
    );

    res.status(200).json({
      ok: true,
      imagePath,
      page: updatedPage,
      mediaKind,
      note: `${mediaKind === "video" ? "Video" : "Image"} applied from library.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown apply error";
    console.error("[upload:apply]", message);
    res.status(400).json({ ok: false, error: message });
  }
});

/**
 * Accepts a base64 data-URL image or video, stores it under /images/uploads,
 * and optionally patches a page asset path.
 */
uploadRouter.post("/", async (req, res) => {
  try {
    const parsed = uploadBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Invalid upload payload." });
      return;
    }

    const { dataUrl, section, assetKey, page } = parsed.data;
    const { mime, buffer } = parseDataUrl(dataUrl);
    const video = isVideoMime(mime);
    const maxBytes = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const kind = video ? "Video" : "Image";

    if (buffer.byteLength > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      res.status(400).json({
        ok: false,
        error: `${kind} must be under ${limitMb}MB (got ${Math.round(buffer.byteLength / (1024 * 1024))}MB).`,
      });
      return;
    }

    await mkdir(UPLOAD_ROOT, { recursive: true });
    const ext = MIME_EXT[mime] ?? extname("file.webp");
    const filename = `${randomUUID()}${ext}`;
    await writeFile(join(UPLOAD_ROOT, filename), buffer);
    const imagePath = `/images/uploads/${filename}`;

    let updatedPage: Page | undefined;
    if (page && section) {
      updatedPage = applyUploadToPage(
        page,
        section,
        assetKey ?? (section === "gallery" ? `gallery-${page.sections.find((s) => s.type === "gallery")?.assets.length ?? 0}` : "primary"),
        imagePath,
      );
    }

    res.status(200).json({
      ok: true,
      imagePath,
      page: updatedPage,
      mediaKind: video ? "video" : "image",
      note: `${kind} uploaded. S3 sync not enabled yet (local storage).`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown upload error";
    console.error("[upload]", message);
    res.status(400).json({ ok: false, error: message });
  }
});
