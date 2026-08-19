import { NextResponse } from "next/server";
import { verifyIdToken } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: Request) {
  let body: { idToken?: string; firstName?: string; lastName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { idToken, firstName, lastName } = body;
  if (
    typeof idToken !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    !idToken ||
    !firstName.trim() ||
    !lastName.trim()
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  if (cleanFirstName.length > 100 || cleanLastName.length > 100) {
    return NextResponse.json({ error: "First name and last name must be 100 characters or fewer." }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  if (typeof decoded.email !== "string" || !decoded.email.trim()) {
    return NextResponse.json({ error: "The authenticated account does not have an email address." }, { status: 400 });
  }

  const verifiedEmail = decoded.email.trim().toLowerCase();

  try {
    const user = await prisma.user.create({
      data: {
        firebaseUid: decoded.uid,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: verifiedEmail,
      },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // A concurrent request or a retry may already have created this row.
    // Reconcile by the verified Firebase UID before treating the create as a
    // failure. Never delete the Firebase identity here: a temporary database
    // failure must remain safely retryable by the account owner.
    let existingByUid;
    try {
      existingByUid = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    } catch {
      console.error("Failed to reconcile registration after database create failure", {
        uid: decoded.uid,
        errorClass: error instanceof Error ? error.constructor.name : typeof error,
      });
      return NextResponse.json(
        { error: "We couldn't finish creating your account. Please try again." },
        { status: 503 },
      );
    }

    if (existingByUid) {
      return NextResponse.json({ user: existingByUid }, { status: 200 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // A row with the same email but a different Firebase UID represents an
      // inconsistent legacy/account-linking state. Do not overwrite it and
      // do not delete either identity automatically.
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    console.error("Failed to create User during registration", {
      uid: decoded.uid,
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json(
      { error: "We couldn't finish creating your account. Please try again." },
      { status: 503 },
    );
  }
}