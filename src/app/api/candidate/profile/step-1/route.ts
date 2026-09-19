import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { parseCandidateProfileInput } from "@/lib/validation/candidate-profile";

/**
 * Saves Step 1 (Personal Details) of the candidate onboarding wizard. Never
 * trusts a client-supplied user id — the `CandidateProfile` row is always
 * resolved/created against the verified session's own `User` row.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("candidateProfileSave", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const session = await requireVerifiedSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = parseCandidateProfileInput(body);
  if (!result.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", issues: result.error.issues }, { status: 400 });
  }

  const { intent, ...fields } = result.data;
  const isContinue = intent === "continue";

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...fields,
      ...(isContinue ? { onboardingStep: 2, step1CompletedAt: new Date() } : {}),
    },
    update: {
      ...fields,
      ...(isContinue ? { onboardingStep: 2, step1CompletedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ candidateProfile: profile });
}
