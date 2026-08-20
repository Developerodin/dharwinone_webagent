import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./repo.js";

/**
 * Keyset pagination cursors.
 *
 * These are round-tripped through an untrusted client, so decoding must be
 * total: any malformed value has to degrade to "start from the beginning"
 * rather than throwing and 500-ing a project list.
 */
describe("pagination cursors", () => {
  it("round-trips a timestamp and id", () => {
    const at = new Date("2026-08-20T10:30:00.000Z");
    const decoded = decodeCursor(encodeCursor(at, "proj_abc"));
    expect(decoded?.updatedAt.toISOString()).toBe(at.toISOString());
    expect(decoded?.id).toBe("proj_abc");
  });

  it("preserves millisecond precision", () => {
    // Two projects saved in the same second must still order deterministically.
    const at = new Date("2026-08-20T10:30:00.123Z");
    expect(decodeCursor(encodeCursor(at, "x"))?.updatedAt.getTime()).toBe(
      at.getTime(),
    );
  });

  it("returns null for a missing cursor", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("returns null for garbage rather than throwing", () => {
    for (const bad of ["!!!", "Zm9v", "////", "a".repeat(500)]) {
      expect(() => decodeCursor(bad)).not.toThrow();
    }
  });

  it("returns null for a cursor with an unparseable date", () => {
    const forged = Buffer.from("not-a-date|proj_1").toString("base64url");
    expect(decodeCursor(forged)).toBeNull();
  });

  it("returns null when a component is missing", () => {
    const forged = Buffer.from("2026-08-20T10:30:00.000Z").toString("base64url");
    expect(decodeCursor(forged)).toBeNull();
  });

  it("produces a URL-safe string", () => {
    const cursor = encodeCursor(new Date(), "proj_+/=");
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
