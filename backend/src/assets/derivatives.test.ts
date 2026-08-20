import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { probeImage } from "./derivatives.js";

/**
 * Builds a real encoded image for probing.
 */
async function makeImage(
  width: number,
  height: number,
  background = "#c04070",
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .jpeg()
    .toBuffer();
}

describe("probeImage", () => {
  it("reads dimensions", async () => {
    const result = await probeImage(await makeImage(800, 450));
    expect(result.width).toBe(800);
    expect(result.height).toBe(450);
  });

  it("produces a compact blurhash", async () => {
    const result = await probeImage(await makeImage(800, 450));
    expect(result.blurhash).toBeTruthy();
    // Compact enough to sit on the row and ship with the project list.
    expect(result.blurhash!.length).toBeLessThan(60);
  });

  it("produces different hashes for visually different images", async () => {
    const [warm, cool] = await Promise.all([
      probeImage(await makeImage(400, 400, "#ff5500")),
      probeImage(await makeImage(400, 400, "#0055ff")),
    ]);
    expect(warm.blurhash).not.toBe(cool.blurhash);
  });

  it("handles a non-square aspect ratio", async () => {
    const result = await probeImage(await makeImage(1600, 400));
    expect(result.width).toBe(1600);
    expect(result.blurhash).toBeTruthy();
  });

  it("degrades to nulls instead of throwing on a non-image", async () => {
    // A committed object that sharp cannot read is still a valid stored file;
    // it simply gets no placeholder.
    const result = await probeImage(Buffer.from("definitely not an image"));
    expect(result).toEqual({ width: null, height: null, blurhash: null });
  });
});
