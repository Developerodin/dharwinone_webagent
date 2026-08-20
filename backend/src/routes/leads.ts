import { Router } from "express";
import type { Request } from "express";
import { validateLeadPayload } from "../lib/leadValidation.js";
import { readSmtpConfig, sendLeadEmail } from "../lib/smtpMailer.js";

export const leadsRouter = Router();

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;
const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Reads a client IP for the in-memory lead rate limit.
 */
function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || "unknown";
}

/**
 * Returns true when this IP is over the lead-submit cap.
 */
function isRateLimited(ip: string, now = Date.now()): boolean {
  const current = hits.get(ip);
  if (!current || current.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_MAX;
}

/**
 * Accepts a visitor contact/reservation form and emails the restaurant owner.
 */
leadsRouter.post("/", async (req, res) => {
  if (isRateLimited(clientIp(req))) {
    res.status(429).json({
      ok: false,
      error: "Too many requests. Please wait a few minutes and try again.",
    });
    return;
  }

  const parsed = validateLeadPayload(req.body);
  if (!parsed.ok) {
    res.status(parsed.status).json({
      ok: false,
      error: parsed.error,
      fields: parsed.fields,
    });
    return;
  }

  if (!readSmtpConfig()) {
    res.status(503).json({
      ok: false,
      error: "Email delivery is not configured.",
    });
    return;
  }

  try {
    await sendLeadEmail(parsed.payload);
    res.json({ ok: true });
  } catch (error) {
    console.error("[leads] SMTP send failed", error instanceof Error ? error.message : error);
    res.status(502).json({
      ok: false,
      error: "Could not send that request. Please try again or call the restaurant.",
    });
  }
});
