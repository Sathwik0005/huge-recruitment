import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { parseCandidateProfileStep3Input } from "@/lib/validation/candidate-profile-step3";

/**
 * Saves Step 3 (Proof of Right to Work & Bank Details) of the candidate
 * onboarding wizard. Never trusts a client-supplied user id — the
 * `CandidateProfile` row is always resolved/created against the verified
 * session's own `User` row. Unlike Step 2, there's no repeatable child table
 * here, so a plain upsert suffices (no `$transaction` needed).
 *
 * On `intent: "submit"`, the submitted fields are always persisted first —
 * even if the profile has no photo yet — so a candidate never loses typed
 * work just because they forgot to add one. Only advancing
 * `onboardingStep`/`step3CompletedAt` (and returning success) is gated on
 * `CandidateProfile.avatarS3Key` already being set, per the mandatory-photo
 * requirement for this, the final, step.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("candidateProfileStep3Save", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const session = await requireVerifiedSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = parseCandidateProfileStep3Input(body);
  if (!result.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", issues: result.error.issues }, { status: 400 });
  }

  const { intent, ...fields } = result.data;
  const isSubmit = intent === "submit";

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...fields },
    update: { ...fields },
  });

  if (isSubmit && !profile.avatarS3Key) {
    return NextResponse.json(
      { error: "A profile picture is required before you can submit.", field: "avatar" },
      { status: 400 },
    );
  }

  if (isSubmit) {
    // Re-submitting always re-locks the profile, even if an admin had
    // temporarily unlocked it for this candidate to make a change.
    const completedProfile = await prisma.candidateProfile.update({
      where: { userId: session.user.id },
      data: { onboardingStep: 3, step3CompletedAt: new Date(), editingUnlockedByAdmin: false },
    });
    return NextResponse.json({ candidateProfile: completedProfile });
  }

  return NextResponse.json({ candidateProfile: profile });
}
