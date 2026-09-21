import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { parseCandidateProfileStep4Input } from "@/lib/validation/candidate-profile-step4";

/**
 * Saves Step 4 (Employee Declaration), the final step of the candidate
 * onboarding wizard as of spec 09. Never trusts a client-supplied user id —
 * the `CandidateProfile` row is always resolved/created against the verified
 * session's own `User` row.
 *
 * The submitted fields are always persisted first — even if the profile has
 * no photo or signature yet — so a candidate never loses their typed name
 * just because they forgot one of those. Only advancing
 * `onboardingStep`/`step4CompletedAt` (and returning success) is gated on
 * `CandidateProfile.avatarS3Key` (mandatory-photo requirement that moved here
 * from Step 3) and `declarationSignatureS3Key` (drawn signature, uploaded
 * separately via `/api/candidate/profile/step-4/signature` before this
 * final submit) both already being set.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("candidateProfileStep4Save", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const session = await requireVerifiedSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = parseCandidateProfileStep4Input(body);
  if (!result.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", issues: result.error.issues }, { status: 400 });
  }

  const { declarationFullName } = result.data;

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, declarationFullName, declarationAcceptedAt: new Date() },
    update: { declarationFullName, declarationAcceptedAt: new Date() },
  });

  if (!profile.avatarS3Key) {
    return NextResponse.json(
      { error: "A profile picture is required before you can submit.", field: "avatar" },
      { status: 400 },
    );
  }

  if (!profile.declarationSignatureS3Key) {
    return NextResponse.json(
      { error: "Please draw your signature before you can submit.", field: "signature" },
      { status: 400 },
    );
  }

  // Re-submitting always re-locks the profile, even if an admin had
  // temporarily unlocked it for this candidate to make a change.
  const completedProfile = await prisma.candidateProfile.update({
    where: { userId: session.user.id },
    data: { onboardingStep: 4, step4CompletedAt: new Date(), editingUnlockedByAdmin: false },
  });
  return NextResponse.json({ candidateProfile: completedProfile });
}
