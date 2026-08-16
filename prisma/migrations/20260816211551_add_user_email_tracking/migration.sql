-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "welcomeEmailSentAt" TIMESTAMP(3);
