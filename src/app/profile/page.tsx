import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { getSignedAvatarUrl } from "@/lib/candidate-avatar";
import { ProfileWizard } from "./ProfileWizard";
import type { Step1InitialValues } from "./Step1Form";
import type { Step2InitialValues, WorkReferenceValue } from "./Step2Form";
import type { Step3InitialValues } from "./Step3Form";
import type { Step4InitialValues } from "./Step4Form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Number of onboarding steps that actually have a built form/tab. Keep this
// in lockstep with STEP_LABELS in RegistrationHero.tsx as later steps ship —
// a step without UI must never become "reachable".
const TOTAL_BUILT_STEPS = 4;

export default async function ProfilePage() {
  const result = await requireVerifiedSession();

  switch (result.status) {
    case "unauthenticated":
    case "unverified":
    case "no-db-user":
      redirect("/login");
  }

  const candidateProfile = await prisma.candidateProfile.findUnique({
    where: { userId: result.user.id },
    include: { workReferences: { orderBy: { displayOrder: "asc" } } },
  });

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

  const step1InitialValues: Step1InitialValues | null = candidateProfile
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

  const step2InitialValues: Step2InitialValues | null = candidateProfile
    ? {
        preferredWorkLocation: candidateProfile.preferredWorkLocation,
        hoursAvailability: candidateProfile.hoursAvailability,
        availabilityToStart: candidateProfile.availabilityToStart,
        interestedSectors: candidateProfile.interestedSectors,
        transportMode: candidateProfile.transportMode,
        shoeSize: candidateProfile.shoeSize ? Number(candidateProfile.shoeSize) : null,
        emergencyContactName: candidateProfile.emergencyContactName,
        emergencyContactMobile: candidateProfile.emergencyContactMobile,
        emergencyContactRelationship: candidateProfile.emergencyContactRelationship,
        referralSource: candidateProfile.referralSource,
      }
    : null;

  const step3InitialValues: Step3InitialValues | null = candidateProfile
    ? {
        rightToWorkDocumentType: candidateProfile.rightToWorkDocumentType,
        brpSubtype: candidateProfile.brpSubtype,
        visaExpiryDate: candidateProfile.visaExpiryDate ? candidateProfile.visaExpiryDate.toISOString().slice(0, 10) : null,
        rightToWorkShareCode: candidateProfile.rightToWorkShareCode,
        rightToWorkShareCodeExpiryDate: candidateProfile.rightToWorkShareCodeExpiryDate
          ? candidateProfile.rightToWorkShareCodeExpiryDate.toISOString().slice(0, 10)
          : null,
        rightToWorkDocFrontS3Key: candidateProfile.rightToWorkDocFrontS3Key,
        rightToWorkDocFrontOriginalFilename: candidateProfile.rightToWorkDocFrontOriginalFilename,
        rightToWorkDocBackS3Key: candidateProfile.rightToWorkDocBackS3Key,
        rightToWorkDocBackOriginalFilename: candidateProfile.rightToWorkDocBackOriginalFilename,
        bankAccountHolderName: candidateProfile.bankAccountHolderName,
        bankAccountNumber: candidateProfile.bankAccountNumber,
        bankSortCode: candidateProfile.bankSortCode,
        bankStatementS3Key: candidateProfile.bankStatementS3Key,
        bankStatementOriginalFilename: candidateProfile.bankStatementOriginalFilename,
      }
    : null;

  const step4InitialValues: Step4InitialValues | null = candidateProfile
    ? {
        declarationFullName: candidateProfile.declarationFullName,
        declarationAcceptedAt: candidateProfile.declarationAcceptedAt
          ? candidateProfile.declarationAcceptedAt.toISOString()
          : null,
      }
    : null;

  const initialWorkReferences: WorkReferenceValue[] =
    candidateProfile?.workReferences.map((reference) => ({
      jobTitle: reference.jobTitle,
      companyName: reference.companyName,
      companyAddress: reference.companyAddress ?? "",
      startDate: reference.startDate.toISOString().slice(0, 7),
      endDate: reference.endDate ? reference.endDate.toISOString().slice(0, 7) : "",
      isCurrentJob: reference.isCurrentJob,
      managerName: reference.managerName ?? "",
      managerMobile: reference.managerMobile ?? "",
      managerEmail: reference.managerEmail ?? "",
    })) ?? [];

  const highestReachableStep = candidateProfile
    ? Math.min(candidateProfile.onboardingStep, TOTAL_BUILT_STEPS)
    : 1;

  const isSubmitted = candidateProfile?.step4CompletedAt != null;
  const editingUnlockedByAdmin = candidateProfile?.editingUnlockedByAdmin ?? false;

  return (
    <main className="w-full bg-surface min-h-screen">
      <ProfileWizard
        firstName={result.user.firstName}
        lastName={result.user.lastName}
        email={result.user.email}
        avatarUrl={avatarUrl}
        highestReachableStep={highestReachableStep}
        isSubmitted={isSubmitted}
        editingUnlockedByAdmin={editingUnlockedByAdmin}
        step1InitialValues={step1InitialValues}
        step2InitialValues={step2InitialValues}
        initialWorkReferences={initialWorkReferences}
        step3InitialValues={step3InitialValues}
        step4InitialValues={step4InitialValues}
      />
    </main>
  );
}
