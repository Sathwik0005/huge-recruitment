import { NextResponse } from "next/server";
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

  await mintSession(idToken);
  await sendWelcomeEmailOnce(user);

  return NextResponse.json({ user }, { status: 200 });
}
