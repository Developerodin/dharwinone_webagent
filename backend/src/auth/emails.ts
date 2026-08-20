import { authEnv } from "../config/env.js";
import { escapeHtml } from "../lib/leadValidation.js";
import { getSmtpTransport, readSmtpConfig } from "../lib/smtpMailer.js";

/**
 * Transactional auth emails.
 *
 * Built on the same SMTP transport as restaurant lead mail. Two rules apply to
 * everything here:
 *
 *  1. Codes are shown as text. No clickable link authenticates anyone, so a
 *     forwarded email cannot be turned into a session by the recipient.
 *  2. Every message says what triggered it and what to do if it wasn't you.
 *     A verification code arriving unprompted is a signal the user should be
 *     able to act on.
 */

type MailContent = {
  subject: string;
  text: string;
  html: string;
};

/**
 * Wraps body HTML in a minimal, client-safe shell.
 *
 * Deliberately table-free and inline-styled: email clients are not browsers,
 * and anything cleverer degrades badly in Outlook.
 */
function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111;line-height:1.55">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #eaecef;font-size:12px;color:#8a9099">
      ProwPlus · this is an automated message, please don't reply.
    </p>
  </div>
</body></html>`;
}

/**
 * Renders a six-digit code as a large, copy-friendly block.
 */
function codeBlock(code: string): string {
  return `<p style="margin:0 0 8px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,monospace">${escapeHtml(code)}</p>`;
}

/**
 * Email verification code.
 */
export function buildVerifyEmailContent(
  code: string,
  ttlMinutes: number,
): MailContent {
  const subject = `${code} is your ProwPlus verification code`;
  const text = [
    "Confirm your email address",
    "",
    `Your verification code is: ${code}`,
    `It expires in ${ttlMinutes} minutes.`,
    "",
    "If you didn't try to create a ProwPlus account, you can ignore this email.",
  ].join("\n");

  const html = shell(
    "Confirm your email address",
    `${codeBlock(code)}
     <p style="margin:0 0 20px;font-size:14px;color:#5c6678">This code expires in ${ttlMinutes} minutes.</p>
     <p style="margin:0;font-size:14px;color:#5c6678">If you didn't try to create a ProwPlus account, you can safely ignore this email.</p>`,
  );

  return { subject, text, html };
}

/**
 * Password-reset code.
 */
export function buildResetPasswordContent(
  code: string,
  ttlMinutes: number,
): MailContent {
  const subject = `${code} is your ProwPlus password reset code`;
  const text = [
    "Reset your password",
    "",
    `Your reset code is: ${code}`,
    `It expires in ${ttlMinutes} minutes.`,
    "",
    "If you didn't request a password reset, ignore this email — your password has not changed.",
  ].join("\n");

  const html = shell(
    "Reset your password",
    `${codeBlock(code)}
     <p style="margin:0 0 20px;font-size:14px;color:#5c6678">This code expires in ${ttlMinutes} minutes.</p>
     <p style="margin:0;font-size:14px;color:#5c6678">If you didn't request this, ignore this email — your password has not changed.</p>`,
  );

  return { subject, text, html };
}

/**
 * Sent when someone requests a reset for an account that signs in with Google.
 *
 * These accounts have no password to reset. Saying so plainly — only to the
 * verified owner of the mailbox — avoids a dead end without leaking to the
 * requester whether the account exists.
 */
export function buildGoogleOnlyResetContent(): MailContent {
  const env = authEnv();
  const subject = "Signing in to ProwPlus";
  const text = [
    "Someone asked to reset the password for this email address.",
    "",
    "Your ProwPlus account signs in with Google, so there's no password to reset.",
    `Continue here: ${env.appUrl}/login`,
    "",
    "If this wasn't you, no action is needed.",
  ].join("\n");

  const html = shell(
    "Signing in to ProwPlus",
    `<p style="margin:0 0 16px;font-size:14px">Someone asked to reset the password for this email address.</p>
     <p style="margin:0 0 20px;font-size:14px">Your account signs in with <strong>Google</strong>, so there's no password to reset.</p>
     <p style="margin:0 0 20px"><a href="${escapeHtml(env.appUrl)}/login" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Continue with Google</a></p>
     <p style="margin:0;font-size:14px;color:#5c6678">If this wasn't you, no action is needed.</p>`,
  );

  return { subject, text, html };
}

/**
 * Sent when a signup is attempted against an address that already has a
 * verified account.
 *
 * The signup endpoint returns a generic success so it cannot be used to test
 * whether an address is registered. The real owner still deserves to know.
 */
export function buildDuplicateSignupContent(): MailContent {
  const env = authEnv();
  const subject = "Someone tried to sign up with your email";
  const text = [
    "Someone just tried to create a ProwPlus account with this email address.",
    "",
    "You already have an account, so nothing was created.",
    `Sign in: ${env.appUrl}/login`,
    `Forgot your password? ${env.appUrl}/forgot-password`,
    "",
    "If this wasn't you, no action is needed — but consider changing your password if you reuse it elsewhere.",
  ].join("\n");

  const html = shell(
    "Someone tried to sign up with your email",
    `<p style="margin:0 0 16px;font-size:14px">Someone just tried to create a ProwPlus account with this email address. You already have an account, so nothing was created.</p>
     <p style="margin:0 0 20px"><a href="${escapeHtml(env.appUrl)}/login" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Sign in</a></p>
     <p style="margin:0;font-size:14px;color:#5c6678">If this wasn't you, no action is needed.</p>`,
  );

  return { subject, text, html };
}

/**
 * Confirmation that a password changed, with a route to report it.
 */
export function buildPasswordChangedContent(): MailContent {
  const env = authEnv();
  const subject = "Your ProwPlus password was changed";
  const text = [
    "Your ProwPlus password was just changed.",
    "",
    "You've been signed out on all devices.",
    "",
    `If this wasn't you, reset your password immediately: ${env.appUrl}/forgot-password`,
  ].join("\n");

  const html = shell(
    "Your password was changed",
    `<p style="margin:0 0 16px;font-size:14px">Your ProwPlus password was just changed, and you've been signed out on all devices.</p>
     <p style="margin:0 0 20px;font-size:14px"><strong>If this wasn't you</strong>, reset your password immediately.</p>
     <p style="margin:0"><a href="${escapeHtml(env.appUrl)}/forgot-password" style="display:inline-block;background:#c43c3c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Reset password</a></p>`,
  );

  return { subject, text, html };
}

/**
 * Sent when a retired refresh token is replayed and we kill a session family.
 */
export function buildSuspiciousSessionContent(): MailContent {
  const env = authEnv();
  const subject = "You were signed out of ProwPlus";
  const text = [
    "We detected an unusual sign-in token for your ProwPlus account and signed you out everywhere as a precaution.",
    "",
    "Signing back in is enough if you recognise this. If you don't, change your password.",
    `${env.appUrl}/login`,
  ].join("\n");

  const html = shell(
    "You were signed out",
    `<p style="margin:0 0 16px;font-size:14px">We detected an unusual sign-in token for your account and signed you out everywhere as a precaution.</p>
     <p style="margin:0 0 20px;font-size:14px">Signing back in is enough if you recognise this. If you don't, change your password.</p>
     <p style="margin:0"><a href="${escapeHtml(env.appUrl)}/login" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Sign in</a></p>`,
  );

  return { subject, text, html };
}

/**
 * Sends an auth email, resolving once the message is handed to SMTP.
 *
 * Returns false rather than throwing when SMTP is unconfigured or the send
 * fails: account creation must not be rolled back because a mail server is
 * down. Callers surface an "email delayed" hint instead.
 */
export async function sendAuthEmail(
  to: string,
  content: MailContent,
): Promise<boolean> {
  const config = readSmtpConfig();
  const transport = getSmtpTransport(config);

  if (!transport || !config) {
    console.warn("[auth] SMTP not configured — email not sent:", content.subject);
    return false;
  }

  const mail = {
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  };

  try {
    await transport.sendMail({ ...mail, from: config.from });
    return true;
  } catch (error) {
    // Gmail rejects a From that isn't the authenticated user; retry once.
    if (config.from.toLowerCase() !== config.username.toLowerCase()) {
      try {
        await transport.sendMail({ ...mail, from: config.username });
        return true;
      } catch (retryError) {
        console.error("[auth] email send failed:", retryError);
        return false;
      }
    }
    console.error("[auth] email send failed:", error);
    return false;
  }
}
