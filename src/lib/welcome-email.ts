import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/auth-email";

interface WelcomeEmailUser {
  id: string;
  email: string;
  firstName: string;
}

/**
 * Sends the welcome email once without falsely recording a failed provider
 * request as successful. The stable Resend idempotency key protects
 * concurrent calls, and the database timestamp is written only after Resend
 * accepts the message. Never throws: authentication must not fail because a
 * non-critical welcome email could not be sent.
 */
export async function sendWelcomeEmailOnce(user: WelcomeEmailUser): Promise<void> {
  let existing: { welcomeEmailSentAt: Date | null } | null;
  try {
    existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { welcomeEmailSentAt: true },
    });
  } catch (error) {
    console.error("Failed to read welcome-email status for user:", user.id, {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
    return;
  }

  if (!existing || existing.welcomeEmailSentAt) return;

  const sent = await sendWelcomeEmail({ email: user.email, firstName: user.firstName, idempotencyKey: `welcome-${user.id}` });
  if (!sent) {
    console.error("Welcome email was not accepted by the email provider for user:", user.id);
    return;
  }

  try {
    await prisma.user.updateMany({
      where: { id: user.id, welcomeEmailSentAt: null },
      data: { welcomeEmailSentAt: new Date() },
    });
  } catch (error) {
    // Resend has already accepted the email. Leave the timestamp null so a
    // later retry can reconcile it using the same provider idempotency key.
    console.error("Welcome email was accepted but its status could not be recorded for user:", user.id, {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
  }
}