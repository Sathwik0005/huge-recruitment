import "server-only";
import { BRAND_NAME, renderBrandedEmailHtml, renderBrandedEmailText, send, type SendResult } from "@/lib/email-template";

export async function sendVerificationEmail({
  email,
  link,
}: {
  email: string;
  link: string;
}): Promise<SendResult> {
  const heading = "Verify your email address";
  const bodyHtml = `Thanks for registering with ${BRAND_NAME}. Please confirm this is your email address to activate your account.`;
  const bodyText = `Thanks for registering with ${BRAND_NAME}. Please confirm this is your email address to activate your account.`;
  const securityNote = "This link will expire soon and can only be used once. If you didn't create an account, you can safely ignore this email.";

  return send("verification", {
    to: email,
    subject: "Verify your email address",
    html: renderBrandedEmailHtml({ heading, bodyHtml, bodyText, ctaLabel: "Verify email address", ctaUrl: link, securityNote }),
    text: renderBrandedEmailText({ heading, bodyHtml, bodyText, ctaLabel: "Verify email address", ctaUrl: link, securityNote }),
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
  const heading = `Welcome to ${BRAND_NAME}, ${firstName}!`;
  const bodyHtml = "Your account is now verified and ready to go. Browse live roles across warehousing, manufacturing, distribution, automotive and production, and apply in a few clicks.";
  const bodyText = "Your account is now verified and ready to go. Browse live roles across warehousing, manufacturing, distribution, automotive and production, and apply in a few clicks.";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return send("welcome", {
    to: email,
    subject: `Welcome to ${BRAND_NAME}`,
    html: renderBrandedEmailHtml({ heading, bodyHtml, bodyText, ctaLabel: appUrl ? "Browse jobs" : undefined, ctaUrl: appUrl ? `${appUrl}/jobs` : undefined }),
    text: renderBrandedEmailText({ heading, bodyHtml, bodyText, ctaLabel: appUrl ? "Browse jobs" : undefined, ctaUrl: appUrl ? `${appUrl}/jobs` : undefined }),
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
    html: renderBrandedEmailHtml({ heading, bodyHtml, bodyText, ctaLabel: "Reset password", ctaUrl: link, securityNote }),
    text: renderBrandedEmailText({ heading, bodyHtml, bodyText, ctaLabel: "Reset password", ctaUrl: link, securityNote }),
  });
}
