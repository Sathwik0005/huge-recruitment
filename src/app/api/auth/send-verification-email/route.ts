import { NextResponse } from "next/server";
import { verifyIdToken, generateEmailVerificationLink } from "@/firebase/admin";
import { sendVerificationEmail } from "@/lib/auth-email";
import { toAppActionLink } from "@/lib/firebase-action-link";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let body: { idToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { idToken } = body;
  if (!idToken) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  const allowed = await checkRateLimit("verificationEmail", decoded.uid);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("NEXT_PUBLIC_APP_URL is not configured; cannot build a verification link");
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  try {
    const firebaseLink = await generateEmailVerificationLink(decoded.email!, {
      url: `${appUrl}/verify-email`,
      handleCodeInApp: true,
    });
    const link = toAppActionLink(firebaseLink, "verifyEmail");
    const sent = await sendVerificationEmail({ email: decoded.email!, link });
    if (!sent) {
      console.error("Verification email was not accepted by the email provider for uid:", decoded.uid);
      return NextResponse.json(
        { error: "Something went wrong sending the verification email. Please try again." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Failed to generate/send verification email for uid:", decoded.uid, {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Something went wrong sending the verification email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
