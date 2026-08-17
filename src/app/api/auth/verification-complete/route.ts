import { NextResponse } from "next/server";
import { getUserByEmail } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmailOnce } from "@/lib/welcome-email";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const GENERIC_RESPONSE = { ok: true } as const;

/**
 * Different-browser verification completion: the client has already
 * consumed the oobCode via the client SDK's applyActionCode (no Admin SDK
 * equivalent exists to re-verify a consumed code server-side). This route
 * treats the client-supplied email only as a lookup key — the actual
 * security-relevant fact (is this email really verified) is independently
 * re-derived from Firebase's own record via getUserByEmail, exactly like
 * /api/auth/session re-checks decoded.email_verified rather than trusting
 * the client. No session is minted here (no idToken exists cross-device).
 * Every branch returns the identical generic response to avoid this
 * becoming an email-existence oracle.
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

  const allowed = await checkRateLimit("verificationComplete", getClientIdentifier(request));
  if (!allowed) {
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  try {
    const firebaseUser = await getUserByEmail(email);
    if (firebaseUser.emailVerified) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await sendWelcomeEmailOnce(user);
      }
    }
  } catch (error) {
    // Includes auth/user-not-found — swallowed deliberately, same generic
    // response either way.
    console.error("verification-complete lookup failed", {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
}
