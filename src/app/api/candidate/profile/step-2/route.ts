import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { parseCandidateProfileStep2Input } from "@/lib/validation/candidate-profile-step2";

/**
 * Saves Step 2 (Work Information & References) of the candidate onboarding
 * wizard. Never trusts a client-supplied user id — the `CandidateProfile` row
 * is always resolved/created against the verified session's own `User` row.
 * `workReferences` is replaced wholesale on every save (delete-and-recreate),
 * mirroring the JobPayRate/JobShift pattern — there is no per-row endpoint.
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
  const result = parseCandidateProfileStep2Input(body);
  if (!result.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", issues: result.error.issues }, { status: 400 });
  }

  const { intent, workReferences, ...fields } = result.data;
  const isContinue = intent === "continue";

  const { profile, savedWorkReferences } = await prisma.$transaction(async (tx) => {
    const profile = await tx.candidateProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...fields,
        ...(isContinue ? { onboardingStep: 3, step2CompletedAt: new Date() } : {}),
      },
      update: {
        ...fields,
        ...(isContinue ? { onboardingStep: 3, step2CompletedAt: new Date() } : {}),
      },
    });

    await tx.candidateWorkReference.deleteMany({ where: { candidateProfileId: profile.id } });

    if (workReferences && workReferences.length > 0) {
      await tx.candidateWorkReference.createMany({
        data: workReferences.map((reference, index) => ({
          ...reference,
          candidateProfileId: profile.id,
          displayOrder: index,
        })),
      });
    }

    const savedWorkReferences = await tx.candidateWorkReference.findMany({
      where: { candidateProfileId: profile.id },
      orderBy: { displayOrder: "asc" },
    });

    return { profile, savedWorkReferences };
  });

  return NextResponse.json({ candidateProfile: profile, workReferences: savedWorkReferences });
}
