import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/auth-email";

interface WelcomeEmailUser {
  id: string;
  email: string;
  firstName: string;
}

/**
 * Sends the welcome email at most once per user, ever. The DB row is the
 * real guard (Resend idempotency keys expire; this doesn't) — only the
 * caller whose `updateMany` actually flips `welcomeEmailSentAt` from null to
 * a timestamp goes on to send. Never throws: registration/login/verification
 * must succeed regardless of email outcome.
 */
export async function sendWelcomeEmailOnce(user: WelcomeEmailUser): Promise<void> {
  let claimed: number;
  try {
    const result = await prisma.user.updateMany({
      where: { id: user.id, welcomeEmailSentAt: null },
      data: { welcomeEmailSentAt: new Date() },
    });
    claimed = result.count;
  } catch (error) {
    console.error("Failed to claim welcome-email guard for user:", user.id, {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
    return;
  }

  if (claimed !== 1) return;

  await sendWelcomeEmail({ email: user.email, firstName: user.firstName, idempotencyKey: `welcome-${user.id}` });
}
