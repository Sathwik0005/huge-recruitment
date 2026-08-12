import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { AdminApplicationsTable } from "./AdminApplicationsTable";

const STATUS_VALUES = Object.values(ApplicationStatus);

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const status = STATUS_VALUES.includes(params.status as ApplicationStatus)
    ? (params.status as ApplicationStatus)
    : undefined;

  const [applications, jobs] = await Promise.all([
    prisma.jobApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(params.jobId ? { jobId: params.jobId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { job: { select: { title: true } } },
      take: 100,
    }),
    prisma.job.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-primary">Applications</h1>

      <form className="flex flex-wrap gap-3 rounded-lg border border-outline-variant bg-surface p-4" method="get">
        <select name="status" defaultValue={status ?? ""} className="h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md">
          <option value="">Any status</option>
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          name="jobId"
          defaultValue={params.jobId ?? ""}
          className="h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        >
          <option value="">Any job</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 px-5 rounded-lg border border-primary text-primary font-bold">
          Filter
        </button>
      </form>

      <AdminApplicationsTable applications={applications} />
    </div>
  );
}
