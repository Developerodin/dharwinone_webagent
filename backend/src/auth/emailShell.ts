import { escapeHtml } from "../lib/leadValidation.js";
import { AUTH_BRAND_NAME, AUTH_LOGO_CID } from "./emailBrand.js";

const BG = "#0c0c0e";
const CARD = "#141416";
const BORDER = "#2a2a2e";
const TEXT = "#f4f4f5";
const MUTED = "#a1a1aa";
const FAINT = "#71717a";
export const EMAIL_ACCENT = "#3b82f6";
export const EMAIL_DANGER = "#c43c3c";

/**
 * Dark Dharwin shell matching the builder theme.
 *
 * Tables + inline CSS: Outlook ignores flex/grid, Gmail strips `<style>`.
 */
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${BG};font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:${TEXT};line-height:1.55">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BG};padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="480" style="max-width:480px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:12px">
          <tr>
            <td style="padding:28px 32px 8px">
              <img src="cid:${AUTH_LOGO_CID}" width="28" height="28" alt="${escapeHtml(AUTH_BRAND_NAME)}" style="display:block;border:0;outline:none;text-decoration:none" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${FAINT}">${escapeHtml(AUTH_BRAND_NAME)}</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;color:${TEXT}">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px">
              <p style="margin:0;padding-top:16px;border-top:1px solid ${BORDER};font-size:12px;color:${FAINT}">
                ${escapeHtml(AUTH_BRAND_NAME)} · this is an automated message, please don't reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Primary CTA styled to the builder blue.
 */
export function emailButton(
  href: string,
  label: string,
  background = EMAIL_ACCENT,
): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${background};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:500">${escapeHtml(label)}</a>`;
}

/**
 * Muted supporting paragraph.
 */
export function emailMuted(text: string): string {
  return `<p style="margin:0;font-size:14px;color:${MUTED}">${text}</p>`;
}

/**
 * Default body paragraph.
 */
export function emailBody(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:${TEXT}">${text}</p>`;
}
