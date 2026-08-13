import { prisma } from "@/lib/prisma";
import { buildCandidateWhere, type CandidateVerification } from "@/lib/admin-metrics";
import { AdminCandidatesTable } from "./AdminCandidatesTable";
import { CandidateFilterBar } from "./CandidateFilterBar";
import { ExportCsvButton } from "./ExportCsvButton";
import { JobPagination } from "@/app/jobs/JobPagination";

const VERIFICATION_VALUES: CandidateVerification[] = ["verified", "pending", "inactive"];
const PAGE_SIZE = 20;

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const sectorId = params.sectorId;
  const verification = VERIFICATION_VALUES.includes(params.verification as CandidateVerification)
    ? (params.verification as CandidateVerification)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const where = buildCandidateWhere({ search, sectorId, verification });

  const [total, candidates, sectors] = await Promise.all([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { job: { select: { title: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.sector.findMany({ orderBy: { label: "asc" } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportQuery = new URLSearchParams();
  if (search) exportQuery.set("search", search);
  if (sectorId) exportQuery.set("sectorId", sectorId);
  if (verification) exportQuery.set("verification", verification);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">Candidates</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage and review job applicants.</p>
        </div>
        <ExportCsvButton queryString={exportQuery.toString()} />
      </div>

      <CandidateFilterBar sectors={sectors} />

      <AdminCandidatesTable candidates={candidates} />

      <JobPagination
        page={page}
        pageCount={pageCount}
        searchParams={params}
        basePath="/admin/candidates"
        label="Candidates pagination"
      />
    </div>
  );
}
