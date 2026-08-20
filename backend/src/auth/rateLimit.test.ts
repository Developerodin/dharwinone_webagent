import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "./rateLimit.js";

describe("MemoryRateLimiter", () => {
  it("allows up to the limit and denies past it", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < 3; i++) {
      expect((await limiter.hit("k", 3, 60_000)).allowed).toBe(true);
    }
    expect((await limiter.hit("k", 3, 60_000)).allowed).toBe(false);
  });

  it("keeps separate keys independent", async () => {
    const limiter = new MemoryRateLimiter();
    await limiter.hit("a", 1, 60_000);
    expect((await limiter.hit("a", 1, 60_000)).allowed).toBe(false);
    expect((await limiter.hit("b", 1, 60_000)).allowed).toBe(true);
  });

  it("resets once the window elapses", async () => {
    const limiter = new MemoryRateLimiter();
    await limiter.hit("k", 1, 20);
    expect((await limiter.hit("k", 1, 20)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect((await limiter.hit("k", 1, 20)).allowed).toBe(true);
  });

  it("clears a key on reset — a successful login forgives near-misses", async () => {
    const limiter = new MemoryRateLimiter();
    await limiter.hit("k", 1, 60_000);
    await limiter.reset("k");
    expect((await limiter.hit("k", 1, 60_000)).allowed).toBe(true);
  });

  it("reports a retryAfter the UI can count down", async () => {
    const limiter = new MemoryRateLimiter();
    await limiter.hit("k", 1, 60_000);
    const denied = await limiter.hit("k", 1, 60_000);
    expect(denied.retryAfterSec).toBeGreaterThan(0);
    expect(denied.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("counts hits beyond the limit without resetting the window", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < 5; i++) await limiter.hit("k", 2, 60_000);
    const result = await limiter.hit("k", 2, 60_000);
    expect(result.used).toBe(6);
    expect(result.allowed).toBe(false);
  });
});
