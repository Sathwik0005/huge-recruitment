-- CreateEnum
CREATE TYPE "SectorName" AS ENUM ('PRODUCTION', 'WAREHOUSING', 'MANUFACTURING', 'DISTRIBUTION', 'AUTOMOTIVE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'TEMPORARY', 'TEMP_TO_PERM', 'FIXED_TERM', 'CONTRACT');

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('NUMERIC', 'COMPETITIVE');

-- CreateEnum
CREATE TYPE "PayPeriod" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "ShiftCategory" AS ENUM ('DAY', 'NIGHT', 'ROTATING', 'WEEKEND', 'FLEXIBLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" "SectorName" NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "overview" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "townOrCity" TEXT NOT NULL,
    "countyOrRegion" TEXT,
    "postcode" TEXT,
    "payType" "PayType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "additionalPayInformation" TEXT,
    "referenceCode" TEXT,
    "clientId" TEXT,
    "shortDescription" TEXT,
    "startDate" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "vacancyCount" INTEGER,
    "hoursPerWeek" DECIMAL(65,30),
    "shiftSummary" TEXT,
    "additionalInformation" TEXT,
    "showPostedDate" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPayRate" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "label" TEXT,
    "minimum" DECIMAL(65,30) NOT NULL,
    "maximum" DECIMAL(65,30),
    "period" "PayPeriod" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobPayRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobShift" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "category" "ShiftCategory" NOT NULL,
    "label" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "days" TEXT,
    "details" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobResponsibility" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequirement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobBenefit" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "publicReference" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "privacyConsentAt" TIMESTAMP(3) NOT NULL,
    "privacyPolicyVersion" TEXT NOT NULL,
    "cvBlobPathname" TEXT,
    "cvOriginalFilename" TEXT,
    "cvMimeType" TEXT,
    "cvSizeBytes" INTEGER,
    "cvUploadedAt" TIMESTAMP(3),
    "cvUploadState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Job_referenceCode_key" ON "Job"("referenceCode");

-- CreateIndex
CREATE INDEX "Job_status_publishedAt_idx" ON "Job"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Job_sectorId_idx" ON "Job"("sectorId");

-- CreateIndex
CREATE INDEX "Job_employmentType_idx" ON "Job"("employmentType");

-- CreateIndex
CREATE INDEX "Job_townOrCity_idx" ON "Job"("townOrCity");

-- CreateIndex
CREATE INDEX "JobPayRate_jobId_idx" ON "JobPayRate"("jobId");

-- CreateIndex
CREATE INDEX "JobShift_jobId_idx" ON "JobShift"("jobId");

-- CreateIndex
CREATE INDEX "JobResponsibility_jobId_idx" ON "JobResponsibility"("jobId");

-- CreateIndex
CREATE INDEX "JobRequirement_jobId_idx" ON "JobRequirement"("jobId");

-- CreateIndex
CREATE INDEX "JobBenefit_jobId_idx" ON "JobBenefit"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_publicReference_key" ON "JobApplication"("publicReference");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_status_idx" ON "JobApplication"("jobId", "status");

-- CreateIndex
CREATE INDEX "JobApplication_createdAt_idx" ON "JobApplication"("createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_email_jobId_createdAt_idx" ON "JobApplication"("email", "jobId", "createdAt");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPayRate" ADD CONSTRAINT "JobPayRate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobShift" ADD CONSTRAINT "JobShift_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobResponsibility" ADD CONSTRAINT "JobResponsibility_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBenefit" ADD CONSTRAINT "JobBenefit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
