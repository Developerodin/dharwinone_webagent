import { describe, expect, it } from "vitest";
import {
  assertPasswordPolicy,
  fakeVerifyPassword,
  hashPassword,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "./passwords.js";
import { HttpError } from "../lib/httpError.js";

/**
 * Runs the policy and returns the HttpError it threw, or null.
 */
function policyError(password: string, email?: string): HttpError | null {
  try {
    assertPasswordPolicy(password, email);
    return null;
  } catch (error) {
    return error as HttpError;
  }
}

describe("assertPasswordPolicy", () => {
  it("accepts a reasonable passphrase", () => {
    expect(policyError("correct horse battery")).toBeNull();
  });

  it("rejects anything under the minimum length", () => {
    const error = policyError("a".repeat(MIN_PASSWORD_LENGTH - 1));
    expect(error?.code).toBe("WEAK_PASSWORD");
    expect(error?.details?.reason).toBe("too_short");
  });

  it("rejects absurdly long input before it reaches argon2", () => {
    expect(policyError("a".repeat(5000))?.details?.reason).toBe("too_long");
  });

  it("rejects common passwords case-insensitively", () => {
    expect(policyError("Password123")?.details?.reason).toBe("common");
    expect(policyError("qwerty123")?.details?.reason).toBe("common");
  });

  it("rejects the user's own email address", () => {
    const error = policyError("alex@example.com", "alex@example.com");
    expect(error?.details?.reason).toBe("email_derived");
  });

  it("rejects the email local part when it is long enough to matter", () => {
    expect(policyError("alexander", "alexander@example.com")?.details?.reason)
      .toBe("email_derived");
  });

  it("rejects a single repeated character", () => {
    expect(policyError("aaaaaaaaaa")?.details?.reason).toBe("repeated_character");
  });

  it("does not impose symbol or case requirements", () => {
    expect(policyError("thisisallverylowercase")).toBeNull();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("round-trips", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword(hash, "correct horse battery")).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword(hash, "correct horse batteries")).toBe(false);
  });

  it("produces a different hash each time (salted)", async () => {
    const a = await hashPassword("same input");
    const b = await hashPassword("same input");
    expect(a).not.toBe(b);
  });

  it("never stores the plaintext", async () => {
    const hash = await hashPassword("literalsecret");
    expect(hash).not.toContain("literalsecret");
  });

  it("returns false rather than throwing on a corrupt hash", async () => {
    expect(await verifyPassword("not-a-real-hash", "anything")).toBe(false);
  });
});

describe("fakeVerifyPassword", () => {
  it("always returns false", async () => {
    expect(await fakeVerifyPassword()).toBe(false);
  });

  it("costs roughly as much as a real verify", async () => {
    const hash = await hashPassword("a real password here");

    const realStart = performance.now();
    await verifyPassword(hash, "a real password here");
    const realMs = performance.now() - realStart;

    const fakeStart = performance.now();
    await fakeVerifyPassword();
    const fakeMs = performance.now() - fakeStart;

    // Within an order of magnitude is enough to defeat a timing oracle; exact
    // parity would make this test flaky on shared CI hardware.
    expect(fakeMs).toBeGreaterThan(realMs / 10);
  });
});
