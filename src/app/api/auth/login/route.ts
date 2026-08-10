import { NextResponse } from "next/server";
import { verifyIdToken } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { mintSession } from "@/lib/mint-session";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: Request) {
  let body: { idToken?: string; provider?: "password" | "google" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { idToken, provider } = body;
  if (!idToken || (provider !== "password" && provider !== "google")) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  // Security: the request body's `provider` field is client-supplied and must
  // never gate a security decision (a client could claim "google" on a plain
  // password-flow token to try to trigger auto-provisioning). The body value
  // is retained only to pick client-side UX copy. The authoritative sign-in
  // method comes from inside the cryptographically-verified token itself.
  const signInProvider = decoded.firebase?.sign_in_provider;
  const isGoogleSignIn = signInProvider === "google.com" && decoded.email_verified === true;

  let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });

  if (!user) {
    if (!isGoogleSignIn) {
      return NextResponse.json(
        { error: "No account found for this email. Please create an account first." },
        { status: 404 },
      );
    }

    const displayName = decoded.name ?? "";
    const [firstName, ...rest] = displayName.trim().split(/\s+/).filter(Boolean);
    const lastName = rest.join(" ");

    try {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          firstName: firstName || "Google",
          lastName: lastName || "User",
          email: decoded.email!,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      throw error;
    }
  }

  await mintSession(idToken);

  return NextResponse.json({ user }, { status: 200 });
}
