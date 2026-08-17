import "server-only";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/html-escape";

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

/**
 * Sends the admin/recruitment team a new-application notification. Never
 * attaches the CV or includes a public/signed CV URL — admins download CVs
 * through the authenticated admin route. Escapes every candidate-controlled
 * value before interpolating into the HTML body. A send failure is the
 * caller's concern to swallow (see src/app/api/applications/route.ts) — it
 * must never roll back an already-persisted application.
 */
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

type ApplicationConfirmationInput = {
  applicationId: string;
  publicReference: string;
  jobTitle: string;
  fullName: string;
  email: string;
};

/**
 * Sends the candidate a confirmation that their application was received.
 * Mirrors sendAdminApplicationNotification's send-failure handling — never
 * rolls back an already-persisted application, just logs and swallows.
 */
export async function sendCandidateApplicationConfirmation(
  input: ApplicationConfirmationInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("Resend is not configured; skipping candidate application confirmation", {
      applicationId: input.applicationId,
    });
    return;
  }

  const resend = new Resend(apiKey);

  const html = `
    <p>Hi ${escapeHtml(input.fullName)},</p>
    <p>Thanks for applying for <strong>${escapeHtml(input.jobTitle)}</strong>. We've received your application.</p>
    <p>Your reference number is <strong>${escapeHtml(input.publicReference)}</strong> — please keep this for your records.</p>
    <p>Our team will review your application and be in touch if you're shortlisted.</p>
  `;

  try {
    await resend.emails.send({
      from,
      to: input.email,
      subject: `Application received: ${input.jobTitle}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send candidate application confirmation", {
      applicationId: input.applicationId,
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
  }
}
