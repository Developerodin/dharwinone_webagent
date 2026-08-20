import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { escapeHtml, type LeadPayload } from "./leadValidation.js";

type SmtpConfig = {
  host: string;
  port: number;
  timeoutMs: number;
  username: string;
  password: string;
  from: string;
};

let cachedTransport: Transporter | null = null;
let cachedConfigKey = "";

/**
 * Reads SMTP settings from env. Returns null when the host/user/password are missing.
 */
export function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const username = process.env.SMTP_USERNAME?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  if (!host || !username || !password) return null;

  const port = Number(process.env.SMTP_PORT ?? 465);
  const timeoutSec = Number(process.env.SMTP_TIMEOUT ?? 7);
  const from = process.env.EMAIL_FROM?.trim() || username;

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    timeoutMs: (Number.isFinite(timeoutSec) && timeoutSec > 0 ? timeoutSec : 7) * 1000,
    username,
    password,
    from,
  };
}

/**
 * Builds (or reuses) a nodemailer transport for the current env.
 */
export function getSmtpTransport(config = readSmtpConfig()): Transporter | null {
  if (!config) return null;
  const key = `${config.host}:${config.port}:${config.username}`;
  if (cachedTransport && cachedConfigKey === key) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
  });
  cachedConfigKey = key;
  return cachedTransport;
}

/**
 * Builds text + HTML bodies for a restaurant lead email.
 */
export function buildLeadEmailContent(payload: LeadPayload): {
  subject: string;
  text: string;
  html: string;
} {
  const isReservation = payload.kind === "reservation";
  const subject = isReservation
    ? `New reservation request for ${payload.businessName}`
    : `New enquiry for ${payload.businessName}`;

  const rows: Array<[string, string]> = [
    ["Name", payload.values.name],
    ["Visitor email", payload.values.email],
  ];
  if (payload.values.phone) rows.push(["Phone", payload.values.phone]);
  if (payload.values.date) rows.push(["Date", payload.values.date]);
  if (payload.values.time) rows.push(["Time", payload.values.time]);
  if (payload.values.partySize) rows.push(["Party size", payload.values.partySize]);
  if (payload.values.message) rows.push(["Message", payload.values.message]);
  rows.push(["Submitted", new Date().toISOString()]);

  const text = [
    subject,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 12px 6px 0;color:#666;font-weight:600;vertical-align:top">${escapeHtml(label)}</th><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.5">
  <h1 style="font-size:18px">${escapeHtml(subject)}</h1>
  <table style="border-collapse:collapse;font-size:14px">${htmlRows}</table>
</body></html>`;

  return { subject, text, html };
}

/**
 * Sends a lead email. Retries From as SMTP_USERNAME when Gmail rejects EMAIL_FROM.
 */
export async function sendLeadEmail(
  payload: LeadPayload,
  transport = getSmtpTransport(),
  config = readSmtpConfig(),
): Promise<void> {
  if (!transport || !config) {
    throw new Error("SMTP is not configured.");
  }

  const content = buildLeadEmailContent(payload);
  const mail = {
    to: payload.toEmail,
    replyTo: payload.values.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  };

  try {
    await transport.sendMail({ ...mail, from: config.from });
  } catch (error) {
    if (config.from.toLowerCase() === config.username.toLowerCase()) {
      throw error;
    }
    await transport.sendMail({ ...mail, from: config.username });
  }
}
