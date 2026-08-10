import { NextResponse } from "next/server";
import { verifyIdToken, deleteUser } from "@/firebase/admin";
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
  if (!idToken || !firstName || !lastName) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        firebaseUid: decoded.uid,
        firstName,
        lastName,
        email: decoded.email!,
      },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // Guarded compensating rollback: only delete the just-created Firebase
    // account if an independent read confirms no Prisma User exists for this
    // exact UID. This distinguishes a genuine orphan from an idempotent
    // retry (or a race where a concurrent request already succeeded).
    let existing;
    try {
      existing = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    } catch {
      // Ground truth is undeterminable — fail safe, never delete.
      console.error("Failed to verify User existence during rollback check for uid:", decoded.uid, error);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    if (existing) {
      // The create actually succeeded previously (idempotent retry / race).
      return NextResponse.json({ user: existing }, { status: 200 });
    }

    // Confirmed orphan: no Prisma User exists for this UID. Safe to clean up.
    try {
      await deleteUser(decoded.uid);
    } catch (deleteError) {
      console.error("Failed to delete orphaned Firebase user", decoded.uid, deleteError);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    console.error("Failed to create User during registration", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
