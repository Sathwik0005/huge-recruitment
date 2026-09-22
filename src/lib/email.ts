import "server-only";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/html-escape";
import { renderBrandedEmailHtml, renderBrandedEmailText, send, type SendResult } from "@/lib/email-template";

type ApplicationNotificationInput = {
  applicationId: string;
  publicReference: string;
  jobTitle: string;
  jobReferenceCode: string | null;
  fullName: string;
  email: string;
  phone: string;
  location: string;
};

export async function sendAdminApplicationNotification(input: ApplicationNotificationInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.RESEND_ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !from || !to) {
    console.error("Resend is not configured; skipping admin application notification", {
      applicationId: input.applicationId,
    });
    return;
  }

  const resend = new Resend(apiKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const html = `
    <p>A new application has been submitted.</p>
    <ul>
      <li><strong>Job:</strong> ${escapeHtml(input.jobTitle)}${input.jobReferenceCode ? ` (${escapeHtml(input.jobReferenceCode)})` : ""}</li>
      <li><strong>Reference:</strong> ${escapeHtml(input.publicReference)}</li>
      <li><strong>Candidate:</strong> ${escapeHtml(input.fullName)}</li>
      <li><strong>Email:</strong> ${escapeHtml(input.email)}</li>
      <li><strong>Phone:</strong> ${escapeHtml(input.phone)}</li>
      <li><strong>Location:</strong> ${escapeHtml(input.location)}</li>
    </ul>
    <p><a href="${escapeHtml(appUrl)}/admin/candidates/${escapeHtml(input.applicationId)}">View in admin</a></p>
  `;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `New application: ${input.jobTitle}`,
      html,
    });
  } catch (error) {
    // Logged with application ID/error class only — never candidate PII.
    console.error("Failed to send admin application notification", {
      applicationId: input.applicationId,
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
  }
}

type ContactFormNotificationInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  reason: string;
  message: string;
};

export async function sendContactFormNotification(input: ContactFormNotificationInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.RESEND_ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !from || !to) {
    console.error("Resend is not configured; skipping contact form notification");
    return;
  }

  const resend = new Resend(apiKey);
  const html = `
    <p>A new contact form message has been submitted.</p>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(input.name)}</li>
      ${input.company ? `<li><strong>Company:</strong> ${escapeHtml(input.company)}</li>` : ""}
      <li><strong>Email:</strong> ${escapeHtml(input.email)}</li>
      <li><strong>Phone:</strong> ${escapeHtml(input.phone)}</li>
      <li><strong>Reason:</strong> ${escapeHtml(input.reason)}</li>
    </ul>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(input.message).replace(/\n/g, "<br />")}</p>
  `;

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: input.email,
      subject: `New contact form message from ${input.name}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send contact form notification", {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
  }
}

type EmployerRequestNotificationInput = {
  fullName: string;
  companyEmail: string;
  sector: string;
  requirementDetail: string;
};

export async function sendEmployerRequestNotification(input: EmployerRequestNotificationInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.RESEND_ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !from || !to) {
    console.error("Resend is not configured; skipping employer request notification");
    return;
  }

  const resend = new Resend(apiKey);
  const html = `
    <p>A new employer talent request has been submitted.</p>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(input.fullName)}</li>
      <li><strong>Company Email:</strong> ${escapeHtml(input.companyEmail)}</li>
      <li><strong>Sector:</strong> ${escapeHtml(input.sector)}</li>
    </ul>
    ${input.requirementDetail ? `<p><strong>Requirement Detail:</strong></p><p>${escapeHtml(input.requirementDetail).replace(/\n/g, "<br />")}</p>` : ""}
  `;

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: input.companyEmail,
      subject: `New employer talent request from ${input.fullName}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send employer request notification", {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
  }
}

type ApplicationConfirmationInput = {
  applicationId: string;
  publicReference: string;
  jobTitle: string;
  fullName: string;
  email: string;
};

/**
 * Sends the candidate a confirmation that their application was received.
 * Uses the same branded template as sendWelcomeEmail (src/lib/auth-email.ts).
 */
export async function sendCandidateApplicationConfirmation(
  input: ApplicationConfirmationInput
): Promise<SendResult> {
  const heading = "Application received";
  const bodyHtml = `Hi ${escapeHtml(input.fullName)}, thanks for applying for <strong>${escapeHtml(input.jobTitle)}</strong> — we've received your application. Your reference number is <strong>${escapeHtml(input.publicReference)}</strong>, please keep this for your records. Our team will review your application and be in touch if you're shortlisted.`;
  const bodyText = `Hi ${input.fullName}, thanks for applying for ${input.jobTitle} — we've received your application. Your reference number is ${input.publicReference}, please keep this for your records. Our team will review your application and be in touch if you're shortlisted.`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return send("candidate application confirmation", {
    to: input.email,
    subject: `Application received: ${input.jobTitle}`,
    html: renderBrandedEmailHtml({ heading, bodyHtml, bodyText, ctaLabel: appUrl ? "Browse more jobs" : undefined, ctaUrl: appUrl ? `${appUrl}/jobs` : undefined }),
    text: renderBrandedEmailText({ heading, bodyHtml, bodyText, ctaLabel: appUrl ? "Browse more jobs" : undefined, ctaUrl: appUrl ? `${appUrl}/jobs` : undefined }),
  });
}
