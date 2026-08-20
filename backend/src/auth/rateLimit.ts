/**
 * Rate limiting.
 *
 * The interface is storage-agnostic on purpose. In-memory counters are per
 * process: behind two instances a "10 attempts" lockout silently becomes 20.
 * Development uses the memory driver; production must supply a shared one.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Requests already counted in the current window. */
  used: number;
  limit: number;
  /** Seconds until the window resets. */
  retryAfterSec: number;
};

export type RateLimiter = {
  /** Counts one hit against `key` and reports whether it is allowed. */
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  /** Clears a key — called after a successful login so a near-miss is forgiven. */
  reset(key: string): Promise<void>;
};

type Bucket = { count: number; resetAt: number };

/**
 * Single-process limiter backed by a Map.
 *
 * Adequate for local development and single-instance deploys. Entries are
 * swept lazily on write so an idle process does not grow unbounded.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  /**
   * Drops expired buckets. Amortised across calls rather than on a timer, so
   * the limiter holds no handles that would keep the process alive.
   */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  async hit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    this.sweep(now);

    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        used: 1,
        limit,
        retryAfterSec: Math.ceil(windowMs / 1000),
      };
    }

    existing.count += 1;
    return {
      allowed: existing.count <= limit,
      used: existing.count,
      limit,
      retryAfterSec: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

let limiter: RateLimiter = new MemoryRateLimiter();

/**
 * Returns the active limiter.
 */
export function rateLimiter(): RateLimiter {
  return limiter;
}

/**
 * Swaps the limiter implementation (Redis in production, fakes in tests).
 */
export function setRateLimiter(next: RateLimiter): void {
  limiter = next;
}

/** Named limits, in one place so they can be reviewed together. */
export const LIMITS = {
  /** Login attempts per IP. */
  loginPerIp: { limit: 20, windowMs: 15 * 60 * 1000 },
  /** Login attempts per account, independent of source IP. */
  loginPerAccount: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Signups per IP — blunts scripted account creation. */
  signupPerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Password-reset requests per IP. */
  forgotPerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** OTP submissions per account. */
  otpVerifyPerAccount: { limit: 15, windowMs: 15 * 60 * 1000 },
  /** Google sign-ins per IP. */
  googlePerIp: { limit: 30, windowMs: 15 * 60 * 1000 },
} as const;
