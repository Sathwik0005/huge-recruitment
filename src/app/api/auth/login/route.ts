import { after, NextResponse } from "next/server";
import { verifyIdToken } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { mintSession } from "@/lib/mint-session";
import { sendWelcomeEmailOnce } from "@/lib/welcome-email";
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

  if (typeof decoded.email !== "string" || !decoded.email.trim()) {
    return NextResponse.json({ error: "The authenticated account does not have an email address." }, { status: 400 });
  }
  const verifiedEmail = decoded.email.trim().toLowerCase();

  let user;
  try {
    user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  } catch (error) {
    console.error("Failed to look up user during login", {
      uid: decoded.uid,
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json({ error: "We couldn't sign you in right now. Please try again." }, { status: 503 });
  }

  let newlyCreated = false;

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
          email: verifiedEmail,
        },
      });
      newlyCreated = true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // A concurrent Google-login request may have created this exact user
        // after the lookup above. Reconcile by the verified UID before
        // reporting a genuine account conflict.
        try {
          user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
        } catch {
          return NextResponse.json({ error: "We couldn't sign you in right now. Please try again." }, { status: 503 });
        }
        if (!user) {
          return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }
      } else {
        console.error("Failed to create Google user during login", {
          uid: decoded.uid,
          errorClass: error instanceof Error ? error.constructor.name : typeof error,
        });
        return NextResponse.json({ error: "We couldn't sign you in right now. Please try again." }, { status: 503 });
      }
    }
  }

  // All successful branches above resolve an application user. Keep a
  // stable non-null reference for the deferred callback below.
  if (!user) {
    return NextResponse.json({ error: "We couldn't sign you in right now. Please try again." }, { status: 503 });
  }
  const authenticatedUser = user;

  // Only a verified identity may ever receive a session: Google sign-ins
  // already required email_verified === true above (isGoogleSignIn), so this
  // only ever blocks the password-flow path, uniformly for new and existing
  // users. The unverified user is still signed in at the Firebase-client
  // level (the ID token itself is valid) — just refused a server session
  // until they verify, so the client can safely route them to /verify-email.
  if (!isGoogleSignIn && !decoded.email_verified) {
    return NextResponse.json(
      { error: "Please verify your email before signing in.", code: "email-not-verified" },
      { status: 403 },
    );
  }

  try {
    await mintSession(idToken);
  } catch (error) {
    console.error("Failed to create session during login", {
      uid: decoded.uid,
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json({ error: "We couldn't sign you in right now. Please try again." }, { status: 500 });
  }

  if (newlyCreated) {
    // Authentication is already complete. A welcome email must never delay
    // or change the successful Google sign-in response.
    after(async () => {
      await sendWelcomeEmailOnce(authenticatedUser);
    });
  }

  return NextResponse.json({ user: authenticatedUser }, { status: 200 });
}