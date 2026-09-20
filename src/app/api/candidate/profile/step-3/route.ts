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
 * As of spec 09, Step 3 is no longer the final step — Step 4 (Employee
 * Declaration) is. `intent: "submit"` still sets `step3CompletedAt` (it's
 * the onboarding-funnel "reached step 3" marker read by admin metrics/
 * notifications) and advances `onboardingStep` to 3 so Step 4 becomes
 * reachable, but — unlike before spec 09 — it never locks the profile
 * read-only and has no mandatory-photo gate (that moved to
 * `/api/candidate/profile/step-4`, whose `step4CompletedAt` is what actually
 * locks the profile).
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

  if (isSubmit) {
    const advancedProfile = await prisma.candidateProfile.update({
      where: { userId: session.user.id },
      data: { onboardingStep: 3, step3CompletedAt: new Date() },
    });
    return NextResponse.json({ candidateProfile: advancedProfile });
  }

  return NextResponse.json({ candidateProfile: profile });
}
