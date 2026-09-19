-- CreateEnum
CREATE TYPE "CandidateTitle" AS ENUM ('MR', 'MRS', 'MISS', 'MS', 'DR', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "step1CompletedAt" TIMESTAMP(3),
    "title" "CandidateTitle",
    "firstName" TEXT,
    "middleName" TEXT,
    "surname" TEXT,
    "gender" "Gender",
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "niNumber" TEXT,
    "isStudying" BOOLEAN,
    "hasUnspentConvictions" BOOLEAN,
    "mobileDialCode" TEXT,
    "mobileNumber" TEXT,
    "avatarS3Key" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "townOrCity" TEXT,
    "countyOrRegion" TEXT,
    "postcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_userId_idx" ON "CandidateProfile"("userId");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
