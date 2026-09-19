import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { getSignedAvatarUrl } from "@/lib/candidate-avatar";
import { RegistrationHero } from "./RegistrationHero";
import { Step1Form, type Step1InitialValues } from "./Step1Form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const result = await requireVerifiedSession();

  switch (result.status) {
    case "unauthenticated":
    case "unverified":
    case "no-db-user":
      redirect("/login");
  }

  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId: result.user.id } });

  let avatarUrl: string | null = null;
  if (candidateProfile?.avatarS3Key) {
    try {
      avatarUrl = await getSignedAvatarUrl(candidateProfile.avatarS3Key);
    } catch {
      // S3 credentials only resolve in Vercel Production (see src/lib/s3.ts) —
      // fall back to no avatar rather than failing the whole page.
      avatarUrl = null;
    }
  }

  const initialValues: Step1InitialValues | null = candidateProfile
    ? {
        title: candidateProfile.title,
        firstName: candidateProfile.firstName,
        middleName: candidateProfile.middleName,
        surname: candidateProfile.surname,
        gender: candidateProfile.gender,
        dateOfBirth: candidateProfile.dateOfBirth ? candidateProfile.dateOfBirth.toISOString().slice(0, 10) : null,
        nationality: candidateProfile.nationality,
        niNumber: candidateProfile.niNumber,
        isStudying: candidateProfile.isStudying,
        hasUnspentConvictions: candidateProfile.hasUnspentConvictions,
        mobileDialCode: candidateProfile.mobileDialCode,
        mobileNumber: candidateProfile.mobileNumber,
        addressLine1: candidateProfile.addressLine1,
        addressLine2: candidateProfile.addressLine2,
        townOrCity: candidateProfile.townOrCity,
        countyOrRegion: candidateProfile.countyOrRegion,
        postcode: candidateProfile.postcode,
      }
    : null;

  return (
    <main className="w-full bg-surface min-h-screen">
      <div className="flex flex-col w-full">
        <RegistrationHero
          firstName={result.user.firstName}
          lastName={result.user.lastName}
          email={result.user.email}
          avatarUrl={avatarUrl}
          currentStep={1}
          stepLabel="Personal Details"
        />
        <div className="w-full py-10 px-gutter">
          <div className="max-w-4xl mx-auto">
            <Step1Form initialValues={initialValues} />
          </div>
        </div>
      </div>
    </main>
  );
}
