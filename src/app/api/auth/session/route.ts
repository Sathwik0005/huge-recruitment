import { after, NextResponse } from "next/server";
import { verifyIdToken } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { mintSession } from "@/lib/mint-session";
import { sendWelcomeEmailOnce } from "@/lib/welcome-email";

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

  // Defense in depth: never trust that the client only calls this endpoint
  // after actually verifying. Re-derive truth from the freshly verified token.
  if (!decoded.email_verified) {
    return NextResponse.json({ error: "Email not verified." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  if (!user) {
    return NextResponse.json({ error: "No account found for this email." }, { status: 404 });
  }

  try {
    await mintSession(idToken);
  } catch (error) {
    console.error("Failed to create verified user session", {
      uid: decoded.uid,
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json(
      { error: "Your email is verified, but we couldn't sign you in automatically. Please sign in again." },
      { status: 500 },
    );
  }

  // The secure session is already complete. Welcome-email processing is
  // non-critical and must not delay or change this successful auth response.
  after(async () => {
    await sendWelcomeEmailOnce(user);
  });

  return NextResponse.json({ user }, { status: 200 });
}