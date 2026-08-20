import { describe, expect, it } from "vitest";
import { resolveMediaType, sniffMime } from "./mime.js";
import { HttpError } from "../lib/httpError.js";

describe("resolveMediaType", () => {
  it("accepts supported images", () => {
    expect(resolveMediaType("image/jpeg").kind).toBe("IMAGE");
    expect(resolveMediaType("image/webp").extension).toBe("webp");
  });

  it("accepts supported video", () => {
    expect(resolveMediaType("video/mp4").kind).toBe("VIDEO");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveMediaType("  IMAGE/PNG  ").extension).toBe("png");
  });

  it("rejects SVG", () => {
    // SVG is an executable document; serving user-supplied SVG would let an
    // attacker run script in whatever origin the asset is served from.
    try {
      resolveMediaType("image/svg+xml");
      expect.unreachable();
    } catch (error) {
      expect((error as HttpError).code).toBe("UNSUPPORTED_MEDIA_TYPE");
    }
  });

  it("rejects arbitrary types", () => {
    for (const mime of ["application/pdf", "text/html", "application/x-php"]) {
      expect(() => resolveMediaType(mime)).toThrow(HttpError);
    }
  });

  it("gives video a larger allowance than images", () => {
    expect(resolveMediaType("video/mp4").maxBytes).toBeGreaterThan(
      resolveMediaType("image/jpeg").maxBytes,
    );
  });
});

describe("sniffMime", () => {
  /**
   * Builds a buffer with the given leading bytes.
   */
  function bytes(...values: number[]): Buffer {
    return Buffer.concat([Buffer.from(values), Buffer.alloc(16)]);
  }

  it("identifies JPEG", () => {
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("identifies PNG", () => {
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
  });

  it("identifies GIF and WebP", () => {
    expect(sniffMime(Buffer.from("GIF89a" + "\0".repeat(16)))).toBe("image/gif");
    expect(
      sniffMime(Buffer.from("RIFF" + "\0\0\0\0" + "WEBP" + "\0".repeat(16))),
    ).toBe("image/webp");
  });

  it("identifies MP4 by its ftyp brand", () => {
    expect(
      sniffMime(Buffer.from("\0\0\0\x18ftypisom" + "\0".repeat(16))),
    ).toBe("video/mp4");
  });

  it("returns null for a file masquerading as an image", () => {
    // The exact case the sniffer exists for: a script uploaded with
    // Content-Type: image/jpeg.
    expect(sniffMime(Buffer.from("<?php system($_GET[0]); ?>" + " ".repeat(16))))
      .toBeNull();
  });

  it("returns null rather than throwing on a truncated buffer", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
