import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSignedAvatarUrl } from "@/lib/candidate-avatar";
import { EditingUnlockToggle } from "../EditingUnlockToggle";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { AddressSection } from "./AddressSection";
import { WorkPreferencesSection } from "./WorkPreferencesSection";
import { WorkReferencesManager } from "./WorkReferencesManager";
import { RightToWorkSection } from "./RightToWorkSection";
import { BankDetailsSection } from "./BankDetailsSection";
import { EmployeeDeclarationSection } from "./EmployeeDeclarationSection";
import { AvatarEditor } from "./AvatarEditor";

const TOTAL_STEPS = 4;

export default async function AdminCandidateProfileDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidateProfile: {
        include: { workReferences: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  if (!user || !user.candidateProfile) {
    notFound();
  }

  const profile = user.candidateProfile;

  let avatarUrl: string | null = null;
  if (profile.avatarS3Key) {
    try {
      avatarUrl = await getSignedAvatarUrl(profile.avatarS3Key);
    } catch {
      // S3 credentials only resolve in Vercel Production (see src/lib/s3.ts) —
      // fall back to no avatar rather than failing the whole page.
      avatarUrl = null;
    }
  }

  const statusLabel = profile.step4CompletedAt ? "Submitted" : `Step ${profile.onboardingStep} of ${TOTAL_STEPS}`;

  const workReferences = profile.workReferences.map((reference) => ({
    id: reference.id,
    jobTitle: reference.jobTitle,
    companyName: reference.companyName,
    companyAddress: reference.companyAddress,
    startDate: reference.startDate,
    endDate: reference.endDate,
    isCurrentJob: reference.isCurrentJob,
    managerName: reference.managerName,
    managerMobile: reference.managerMobile,
    managerEmail: reference.managerEmail,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/candidate-profiles" className="text-label-sm text-primary hover:underline">
          &larr; Back to Candidate Profiles
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-outline-variant p-6">
        <AvatarEditor userId={user.id} avatarUrl={avatarUrl} firstName={user.firstName} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-headline-lg text-on-surface">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-body-md text-on-surface-variant">{user.email}</p>
          <p className="text-label-sm text-on-surface-variant mt-1">
            Onboarding status: <span className="font-bold">{statusLabel}</span>
          </p>
        </div>
        {profile.step4CompletedAt && (
          <EditingUnlockToggle userId={user.id} unlocked={profile.editingUnlockedByAdmin} />
        )}
      </div>

      <PersonalInfoSection
        userId={user.id}
        values={{
          title: profile.title,
          firstName: profile.firstName,
          middleName: profile.middleName,
          surname: profile.surname,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth,
          nationality: profile.nationality,
          niNumber: profile.niNumber,
          isStudying: profile.isStudying,
          hasUnspentConvictions: profile.hasUnspentConvictions,
          mobileDialCode: profile.mobileDialCode,
          mobileNumber: profile.mobileNumber,
        }}
      />

      <AddressSection
        userId={user.id}
        values={{
          addressLine1: profile.addressLine1,
          addressLine2: profile.addressLine2,
          townOrCity: profile.townOrCity,
          countyOrRegion: profile.countyOrRegion,
          postcode: profile.postcode,
        }}
      />

      <WorkPreferencesSection
        userId={user.id}
        values={{
          preferredWorkLocation: profile.preferredWorkLocation,
          hoursAvailability: profile.hoursAvailability,
          availabilityToStart: profile.availabilityToStart,
          interestedSectors: profile.interestedSectors,
          transportMode: profile.transportMode,
          shoeSize: profile.shoeSize ? profile.shoeSize.toNumber() : null,
          emergencyContactName: profile.emergencyContactName,
          emergencyContactMobile: profile.emergencyContactMobile,
          emergencyContactRelationship: profile.emergencyContactRelationship,
          referralSource: profile.referralSource,
        }}
      />

      <WorkReferencesManager userId={user.id} initialReferences={workReferences} />

      <RightToWorkSection
        userId={user.id}
        values={{
          rightToWorkDocumentType: profile.rightToWorkDocumentType,
          brpSubtype: profile.brpSubtype,
          visaExpiryDate: profile.visaExpiryDate,
          rightToWorkShareCode: profile.rightToWorkShareCode,
          rightToWorkShareCodeExpiryDate: profile.rightToWorkShareCodeExpiryDate,
          rightToWorkDocFrontOriginalFilename: profile.rightToWorkDocFrontOriginalFilename,
          rightToWorkDocBackOriginalFilename: profile.rightToWorkDocBackOriginalFilename,
          hasRightToWorkDocFront: Boolean(profile.rightToWorkDocFrontS3Key),
          hasRightToWorkDocBack: Boolean(profile.rightToWorkDocBackS3Key),
        }}
      />

      <BankDetailsSection
        userId={user.id}
        values={{
          bankAccountHolderName: profile.bankAccountHolderName,
          bankAccountNumber: profile.bankAccountNumber,
          bankSortCode: profile.bankSortCode,
          bankStatementOriginalFilename: profile.bankStatementOriginalFilename,
          hasBankStatement: Boolean(profile.bankStatementS3Key),
        }}
      />

      <EmployeeDeclarationSection
        values={{
          declarationFullName: profile.declarationFullName,
          declarationAcceptedAt: profile.declarationAcceptedAt,
        }}
      />
    </div>
  );
}
