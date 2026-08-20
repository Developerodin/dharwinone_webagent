import sharp from "sharp";
import { encode } from "blurhash";
import { putObject } from "../storage/driver.js";

/**
 * Image post-processing.
 *
 * Runs after the object is committed, never in the request path: generating
 * four widths in two formats takes seconds on a large photo, and nothing the
 * user is waiting for depends on it.
 */

/** Widths generated for responsive `srcset`. */
const WIDTHS = [480, 960, 1600, 2400] as const;

/** Formats generated, best first. */
const FORMATS = ["avif", "webp"] as const;

export type DerivativeMap = Record<string, Record<string, string>>;

export type ProbeResult = {
  width: number | null;
  height: number | null;
  blurhash: string | null;
};

/**
 * Reads dimensions and computes a blurhash placeholder.
 *
 * The blurhash lets the client paint an approximation of the image at its real
 * aspect ratio before any bytes arrive, which is what keeps a hero photo from
 * shifting the layout when it loads.
 */
export async function probeImage(buffer: Buffer): Promise<ProbeResult> {
  try {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? null;
    const height = metadata.height ?? null;

    // 32px is plenty: blurhash encodes a handful of DCT components, so a
    // larger sample costs time without changing the output.
    const { data, info } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: "inside" })
      .toBuffer({ resolveWithObject: true });

    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      3,
    );

    return { width, height, blurhash };
  } catch {
    // A file that sharp cannot read is still a valid stored object; it simply
    // gets no placeholder and no derivatives.
    return { width: null, height: null, blurhash: null };
  }
}

/**
 * Strips metadata and generates responsive derivatives.
 *
 * EXIF is dropped rather than preserved: a restaurant owner's phone photo
 * routinely carries GPS coordinates, and republishing those on a public site
 * is a privacy leak they never agreed to.
 *
 * Widths larger than the source are skipped — upscaling produces a bigger file
 * that looks worse than the original.
 */
export async function generateDerivatives(
  buffer: Buffer,
  baseKey: string,
  sourceWidth: number | null,
): Promise<DerivativeMap> {
  const map: DerivativeMap = {};

  for (const format of FORMATS) {
    for (const width of WIDTHS) {
      if (sourceWidth && width > sourceWidth) continue;

      try {
        const pipeline = sharp(buffer)
          .rotate() // Apply EXIF orientation before the metadata is discarded.
          .resize(width, undefined, { withoutEnlargement: true });

        const output =
          format === "avif"
            ? await pipeline.avif({ quality: 55 }).toBuffer()
            : await pipeline.webp({ quality: 78 }).toBuffer();

        const key = `${baseKey}/w${width}.${format}`;
        await putObject({
          storageKey: key,
          body: output,
          mime: `image/${format}`,
        });

        map[format] ??= {};
        map[format][String(width)] = key;
      } catch (error) {
        // One failed size must not abandon the rest; the original still serves.
        console.warn(
          `[assets] derivative ${format}@${width} failed for ${baseKey}:`,
          error,
        );
      }
    }
  }

  return map;
}
