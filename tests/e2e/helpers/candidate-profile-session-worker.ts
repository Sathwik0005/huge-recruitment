/**
 * Runs under `tsx` (real Node ESM, via child_process from
 * candidate-profile-session.ts) — same reasoning as admin-session-worker.ts.
 *
 * Seeds a `User` (role: USER, no real Firebase account needed — this
 * candidate is only ever *viewed/edited by an admin* in the specs that use
 * this helper, never signed in as themselves) with a fully-populated,
 * "submitted" `CandidateProfile` (all three onboarding steps completed) plus
 * one `CandidateWorkReference`, mirroring real data an admin would encounter
 * after a candidate completes the 05/06/07 wizard — without having to drive
 * that whole multi-step, file-upload-heavy wizard through the browser just to
 * exercise the *admin* detail/edit page this spec adds.
 *
 * Document/avatar S3 keys are deliberately left null (no real S3 test
 * credentials are assumed here) so specs can assert the real "Not uploaded"
 * empty state instead of a fabricated signed document.
 */
import path from "node:path";
import { writeFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../../.env.local") });

async function create(outFile: string) {
  const { prisma } = await import("../../../src/lib/prisma");
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `e2e+candprofile-${runId}@example.test`;
  const firstName = "E2E";
  const lastName = `Profile${runId}`;

  const user = await prisma.user.create({
    data: {
      // No corresponding real Firebase Auth account — nothing in these specs
      // signs in as this candidate, only an admin session views/edits them.
      firebaseUid: `e2e-profile-uid-${runId}`,
      firstName,
      lastName,
      email,
      role: "USER",
      status: "ACTIVE",
      candidateProfile: {
        create: {
          onboardingStep: 3,
          step1CompletedAt: new Date(),
          step2CompletedAt: new Date(),
          step3CompletedAt: new Date(),
          // Step 1 — Personal Info / Address
          title: "MR",
          firstName,
          surname: lastName,
          gender: "MALE",
          dateOfBirth: new Date("1990-01-01"),
          nationality: "GB",
          niNumber: "QQ123456C",
          isStudying: false,
          hasUnspentConvictions: false,
          mobileDialCode: "+44",
          mobileNumber: "7123456789",
          addressLine1: "1 Example Street",
          townOrCity: "Manchester",
          countyOrRegion: "Greater Manchester",
          postcode: "M1 1AA",
          // Step 2 — Work Preferences
          preferredWorkLocation: "Manchester, Leeds",
          hoursAvailability: "THIRTY_PLUS",
          availabilityToStart: "IMMEDIATE",
          interestedSectors: ["WAREHOUSING", "MANUFACTURING"],
          transportMode: "CAR",
          shoeSize: 9,
          emergencyContactName: "E2E Emergency Contact",
          emergencyContactMobile: "7987654321",
          emergencyContactRelationship: "FRIEND",
          referralSource: "GOOGLE_SEARCH",
          // Step 3 — Right to Work (PASSPORT branch) + Bank Details
          rightToWorkDocumentType: "PASSPORT",
          visaExpiryDate: new Date("2030-01-01"),
          rightToWorkShareCode: "AbC123XyZ",
          bankAccountHolderName: "E2E Test Holder",
          bankAccountNumber: "12345678",
          bankSortCode: "123456",
          workReferences: {
            create: [
              {
                jobTitle: "Warehouse Operative",
                companyName: "Example Logistics Ltd",
                companyAddress: "2 Example Road, Manchester",
                startDate: new Date("2020-01-01"),
                endDate: new Date("2022-01-01"),
                isCurrentJob: false,
                managerName: "Manager One",
                managerMobile: "7111111111",
                managerEmail: "manager1@example.test",
                displayOrder: 0,
              },
            ],
          },
        },
      },
    },
  });

  writeFileSync(outFile, JSON.stringify({ userId: user.id, email, firstName, lastName }));
}

async function cleanup(userId: string) {
  const { prisma } = await import("../../../src/lib/prisma");
  // CandidateProfile/CandidateWorkReference cascade-delete from User
  // (onDelete: Cascade, see .claude/rules/database.md) — deleting the User
  // row is sufficient. No Firebase account exists for this synthetic user.
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

const [, , mode, arg1] = process.argv;

(async () => {
  if (mode === "create") {
    await create(arg1);
  } else if (mode === "cleanup") {
    await cleanup(arg1);
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
  const { prisma } = await import("../../../src/lib/prisma");
  await prisma.$disconnect();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
