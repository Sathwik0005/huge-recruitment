-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "declarationAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "declarationFullName" TEXT,
ADD COLUMN     "step4CompletedAt" TIMESTAMP(3);
