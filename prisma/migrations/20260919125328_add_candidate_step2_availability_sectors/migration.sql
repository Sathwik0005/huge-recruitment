-- CreateEnum
CREATE TYPE "AvailabilityToStart" AS ENUM ('IMMEDIATE', 'NEXT_WEEK', 'TWO_TO_THREE_WEEKS', 'FOUR_WEEKS_PLUS');

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "availabilityToStart" "AvailabilityToStart",
ADD COLUMN     "interestedSectors" "SectorName"[] DEFAULT ARRAY[]::"SectorName"[];
