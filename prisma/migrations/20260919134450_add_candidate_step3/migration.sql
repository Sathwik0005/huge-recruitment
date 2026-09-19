-- CreateEnum
CREATE TYPE "RightToWorkDocumentType" AS ENUM ('PASSPORT', 'ID_CARD', 'BRP_EVISA');

-- CreateEnum
CREATE TYPE "BrpSubtype" AS ENUM ('PHYSICAL_BRP', 'EVISA');

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "bankAccountHolderName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankSortCode" TEXT,
ADD COLUMN     "bankStatementOriginalFilename" TEXT,
ADD COLUMN     "bankStatementS3Key" TEXT,
ADD COLUMN     "brpSubtype" "BrpSubtype",
ADD COLUMN     "rightToWorkDocBackOriginalFilename" TEXT,
ADD COLUMN     "rightToWorkDocBackS3Key" TEXT,
ADD COLUMN     "rightToWorkDocFrontOriginalFilename" TEXT,
ADD COLUMN     "rightToWorkDocFrontS3Key" TEXT,
ADD COLUMN     "rightToWorkDocumentType" "RightToWorkDocumentType",
ADD COLUMN     "rightToWorkShareCode" TEXT,
ADD COLUMN     "rightToWorkShareCodeExpiryDate" TIMESTAMP(3),
ADD COLUMN     "step3CompletedAt" TIMESTAMP(3),
ADD COLUMN     "visaExpiryDate" TIMESTAMP(3);
