-- CreateEnum
CREATE TYPE "HoursAvailability" AS ENUM ('ZERO_TO_TEN', 'TEN_TO_TWENTY', 'TWENTY_TO_THIRTY', 'THIRTY_PLUS');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('CAR', 'BUS', 'TAXI', 'CYCLE', 'WALK', 'TRAIN');

-- CreateEnum
CREATE TYPE "EmergencyContactRelationship" AS ENUM ('SPOUSE_PARTNER', 'RELATIVE_FAMILY', 'FRIEND', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('INDEED_JOB_BOARD', 'GOOGLE_SEARCH', 'SOCIAL_MEDIA', 'FRIEND_COLLEAGUE_REFERRAL', 'JOBCENTRE_PLUS', 'OTHER');

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "emergencyContactMobile" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactRelationship" "EmergencyContactRelationship",
ADD COLUMN     "hoursAvailability" "HoursAvailability",
ADD COLUMN     "preferredWorkLocation" TEXT,
ADD COLUMN     "referralSource" "ReferralSource",
ADD COLUMN     "shoeSize" DECIMAL(65,30),
ADD COLUMN     "step2CompletedAt" TIMESTAMP(3),
ADD COLUMN     "transportMode" "TransportMode";

-- CreateTable
CREATE TABLE "CandidateWorkReference" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrentJob" BOOLEAN NOT NULL DEFAULT false,
    "managerName" TEXT,
    "managerMobile" TEXT,
    "managerEmail" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateWorkReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateWorkReference_candidateProfileId_idx" ON "CandidateWorkReference"("candidateProfileId");

-- AddForeignKey
ALTER TABLE "CandidateWorkReference" ADD CONSTRAINT "CandidateWorkReference_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
