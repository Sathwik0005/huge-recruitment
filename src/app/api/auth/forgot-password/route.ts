import { NextResponse } from "next/server";
import { generatePasswordResetLink } from "@/firebase/admin";
import { sendPasswordResetLinkEmail } from "@/lib/auth-email";
import { toAppActionLink } from "@/lib/firebase-action-link";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const GENERIC_RESPONSE = { ok: true } as const;

/**
 * Anti-enumeration: every branch (malformed email aside) returns the exact
 * same 200 body, whether the account exists, doesn't exist, or the send
 * itself failed. Only a missing/empty email field is treated differently,
 * since that reveals nothing about account existence.
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const allowed = await checkRateLimit("forgotPassword", getClientIdentifier(request));
  if (!allowed) {
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const firebaseLink = await generatePasswordResetLink(email, {
        url: `${appUrl}/reset-password`,
        handleCodeInApp: true,
      });
      const link = toAppActionLink(firebaseLink, "resetPassword");
      const sent = await sendPasswordResetLinkEmail({ email, link });
      if (!sent) {
        // Still returns the same generic response below (anti-enumeration) —
        // this is logged so a systemic Resend failure is visible, without
        // revealing send outcomes to the caller.
        console.error("forgot-password email was not accepted by the email provider");
      }
    } catch (error) {
      // Includes auth/user-not-found for a non-existent account — swallowed
      // deliberately, same generic response either way.
      console.error("forgot-password link generation/send failed", {
        errorClass: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    console.error("NEXT_PUBLIC_APP_URL is not configured; cannot build a password-reset link");
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
}
