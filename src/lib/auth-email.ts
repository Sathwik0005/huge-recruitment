import "server-only";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/html-escape";

const BRAND_NAME = "Huge Requirements Limited";
const LOGO_URL = "https://res.cloudinary.com/uhfrtle0/image/upload/v1786575206/company_logo_new.png";
const COLOR_PRIMARY = "#022448";
const COLOR_ON_PRIMARY = "#ffffff";
const COLOR_BACKGROUND = "#f8f9ff";
const COLOR_ON_BACKGROUND = "#121c2a";
const COLOR_MUTED = "#43474e";
const COLOR_BORDER = "#c4c6cf";

/** true only when Resend's API accepted the send request. */
type SendResult = boolean;

interface RenderInput {
  heading: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  securityNote?: string;
}

function renderAuthEmailHtml({ heading, bodyHtml, ctaLabel, ctaUrl, securityNote }: RenderInput): string {
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `
        <tr>
          <td style="padding: 8px 0 24px 0;" align="center">
            <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background-color: ${COLOR_PRIMARY}; color: ${COLOR_ON_PRIMARY}; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 8px;">${escapeHtml(ctaLabel)}</a>
          </td>
        </tr>`
      : "";

  const securityBlock = securityNote
    ? `<tr><td style="padding: 0 0 24px 0; font-size: 13px; color: ${COLOR_MUTED};">${escapeHtml(securityNote)}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${COLOR_BACKGROUND}; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLOR_BACKGROUND};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid ${COLOR_BORDER};">
            <tr>
              <td style="background-color: ${COLOR_PRIMARY}; padding: 24px; text-align: center;">
                <img src="${LOGO_URL}" alt="${escapeHtml(BRAND_NAME)}" height="32" style="height: 32px; width: auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 0 16px 0; font-size: 22px; font-weight: bold; color: ${COLOR_ON_BACKGROUND};">${escapeHtml(heading)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: ${COLOR_ON_BACKGROUND};">${bodyHtml}</td>
                  </tr>
                  ${ctaBlock}
                  ${securityBlock}
                  <tr>
                    <td style="padding: 16px 0 0 0; font-size: 14px; color: ${COLOR_MUTED};">
                      Need help? Contact us at <a href="mailto:info@hugerequirements.co.uk" style="color: ${COLOR_PRIMARY};">info@hugerequirements.co.uk</a>.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px; background-color: ${COLOR_BACKGROUND}; border-top: 1px solid ${COLOR_BORDER}; text-align: center; font-size: 12px; color: ${COLOR_MUTED};">
                ${escapeHtml(BRAND_NAME)} &middot; This is an automated message, please don't reply directly to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderAuthEmailText({ heading, bodyText, ctaLabel, ctaUrl, securityNote }: RenderInput): string {
  const lines = [heading, "", bodyText];
  if (ctaLabel && ctaUrl) {
    lines.push("", `${ctaLabel}: ${ctaUrl}`);
  }
  if (securityNote) {
    lines.push("", securityNote);
  }
  lines.push("", "Need help? Contact us at info@hugerequirements.co.uk.", "", BRAND_NAME);
  return lines.join("\n");
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

async function send(
  kind: string,
  { to, subject, html, text, idempotencyKey }: { to: string; subject: string; html: string; text: string; idempotencyKey?: string },
): Promise<SendResult> {
  const config = getResendConfig();
  if (!config) {
    console.error(`Resend is not configured; skipping ${kind} email`);
    return false;
  }

  const resend = new Resend(config.apiKey);
  try {
    // The Resend SDK reports API-level rejections (invalid/unverified
    // sender domain, suppressed recipient, quota, etc.) as a non-null
    // `error` field on a resolved result — it does NOT throw for those.
    // Only network/transport failures throw. Checking `error` here is what
    // makes an accepted-vs-rejected send actually distinguishable.
    const { error } = await resend.emails.send(
      { from: config.from, to, subject, html, text },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    if (error) {
      console.error(`Resend rejected the ${kind} email`, {
        errorName: error.name,
        errorMessage: error.message,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Failed to send ${kind} email`, {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function sendVerificationEmail({
  email,
  link,
}: {
  email: string;
  link: string;
}): Promise<SendResult> {
  const heading = "Verify your email address";
  const bodyHtml = "Thanks for registering with Huge Requirements Limited. Please confirm this is your email address to activate your account.";
  const bodyText = `Thanks for registering with Huge Requirements Limited. Please confirm this is your email address to activate your account.`;
  const securityNote = "This link will expire soon and can only be used once. If you didn't create an account, you can safely ignore this email.";

  return send("verification", {
    to: email,
    subject: "Verify your email address",
    html: renderAuthEmailHtml({ heading, bodyHtml, bodyText, ctaLabel: "Verify email address", ctaUrl: link, securityNote }),
    text: renderAuthEmailText({ heading, bodyHtml, bodyText, ctaLabel: "Verify email address", ctaUrl: link, securityNote }),
  });
}

export async function sendWelcomeEmail({
  email,
  firstName,
  idempotencyKey,
}: {
  email: string;
  firstName: string;
  idempotencyKey?: string;
}): Promise<SendResult> {
  const heading = `Welcome to Huge Requirements Limited, ${firstName}!`;
  const bodyHtml = "Your account is now verified and ready to go. Browse live roles across warehousing, manufacturing, distribution, automotive and production, and apply in a few clicks.";
  const bodyText = "Your account is now verified and ready to go. Browse live roles across warehousing, manufacturing, distribution, automotive and production, and apply in a few clicks.";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return send("welcome", {
    to: email,
    subject: "Welcome to Huge Requirements Limited",
    html: renderAuthEmailHtml({ heading, bodyHtml, bodyText, ctaLabel: appUrl ? "Browse jobs" : undefined, ctaUrl: appUrl ? `${appUrl}/jobs` : undefined }),
    text: renderAuthEmailText({ heading, bodyHtml, bodyText, ctaLabel: appUrl ? "Browse jobs" : undefined, ctaUrl: appUrl ? `${appUrl}/jobs` : undefined }),
    idempotencyKey,
  });
}

export async function sendPasswordResetLinkEmail({
  email,
  link,
}: {
  email: string;
  link: string;
}): Promise<SendResult> {
  const heading = "Reset your password";
  const bodyHtml = "We received a request to reset the password for this account. Click the button below to choose a new password.";
  const bodyText = "We received a request to reset the password for this account. Click the link below to choose a new password.";
  const securityNote = "This link will expire soon and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password will not be changed.";

  return send("password reset", {
    to: email,
    subject: "Reset your password",
    html: renderAuthEmailHtml({ heading, bodyHtml, bodyText, ctaLabel: "Reset password", ctaUrl: link, securityNote }),
    text: renderAuthEmailText({ heading, bodyHtml, bodyText, ctaLabel: "Reset password", ctaUrl: link, securityNote }),
  });
}
