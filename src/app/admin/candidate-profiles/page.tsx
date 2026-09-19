import { prisma } from "@/lib/prisma";
import { CandidateProfileTable } from "./CandidateProfileTable";
import { CandidateProfileSearchBar } from "./CandidateProfileSearchBar";
import { JobPagination } from "@/app/jobs/JobPagination";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function AdminCandidateProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const page = Math.max(1, Number(params.page) || 1);

  // Not filtered by role: CandidateProfile is 1:1 with User regardless of
  // role, so an ADMIN account that has also gone through the onboarding
  // wizard (e.g. an internal test/dogfooding account) still needs to be
  // manageable here — the thing that matters is "has a submitted/in-progress
  // profile", not "is a non-admin".
  const where: Prisma.UserWhereInput = {
    candidateProfile: { isNot: null },
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { candidateProfile: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const rows = users
    .filter((user) => user.candidateProfile)
    .map((user) => ({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      onboardingStep: user.candidateProfile!.onboardingStep,
      step3CompletedAt: user.candidateProfile!.step3CompletedAt,
      editingUnlockedByAdmin: user.candidateProfile!.editingUnlockedByAdmin,
    }));

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg text-on-surface">Candidate Profiles</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Registered candidates going through the profile onboarding wizard. Once a candidate submits their
          profile it locks for editing — use &quot;Allow Editing&quot; here to grant a one-time exception.
        </p>
      </div>

      <CandidateProfileSearchBar />

      <CandidateProfileTable rows={rows} />

      <JobPagination
        page={page}
        pageCount={pageCount}
        searchParams={params}
        basePath="/admin/candidate-profiles"
        label="Candidate profiles pagination"
      />
    </div>
  );
}
