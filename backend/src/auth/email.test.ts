import { describe, expect, it } from "vitest";
import { dedupeKey, maskEmail, normalizeEmail } from "./email.js";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Alex@Example.COM ")).toBe("alex@example.com");
  });

  it("preserves dots and tags for delivery", () => {
    expect(normalizeEmail("a.b+tag@example.com")).toBe("a.b+tag@example.com");
  });
});

describe("dedupeKey", () => {
  it("folds gmail dots and tags onto one identity", () => {
    const canonical = dedupeKey("auser@gmail.com");
    expect(dedupeKey("a.user@gmail.com")).toBe(canonical);
    expect(dedupeKey("a.u.s.e.r@gmail.com")).toBe(canonical);
    expect(dedupeKey("auser+shopping@gmail.com")).toBe(canonical);
    expect(dedupeKey("A.User+Tag@GMAIL.com")).toBe(canonical);
  });

  it("treats googlemail as gmail", () => {
    expect(dedupeKey("a.user@googlemail.com")).toBe("auser@googlemail.com");
  });

  it("leaves other providers untouched — their dots are significant", () => {
    expect(dedupeKey("a.user@fastmail.com")).toBe("a.user@fastmail.com");
    expect(dedupeKey("a.user+tag@outlook.com")).toBe("a.user+tag@outlook.com");
  });

  it("keeps distinct gmail accounts distinct", () => {
    expect(dedupeKey("alice@gmail.com")).not.toBe(dedupeKey("bob@gmail.com"));
  });

  it("does not collapse a local part to empty", () => {
    expect(dedupeKey("...@gmail.com")).not.toBe("@gmail.com");
  });

  it("passes through malformed input without throwing", () => {
    expect(dedupeKey("not-an-email")).toBe("not-an-email");
  });
});

describe("maskEmail", () => {
  it("masks the middle of the local part", () => {
    expect(maskEmail("alexander@gmail.com")).toBe("a•••••••r@gmail.com");
  });

  it("handles very short local parts", () => {
    expect(maskEmail("ab@x.com")).toBe("a•@x.com");
  });

  it("caps the mask so length is not leaked", () => {
    const masked = maskEmail("averyveryverylonglocalpart@example.com");
    expect(masked).toBe("a••••••••t@example.com");
  });
});
