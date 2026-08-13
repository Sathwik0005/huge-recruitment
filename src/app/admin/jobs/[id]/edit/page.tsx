import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { JobEditor, type JobEditorInitialValues } from "../../JobEditor";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session.status !== "ok") redirect(session.status === "forbidden" ? "/" : "/login");

  const { id } = await params;
  const [job, sectors, clients] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      include: {
        payRates: { orderBy: { displayOrder: "asc" } },
        shifts: { orderBy: { displayOrder: "asc" } },
        responsibilities: { orderBy: { displayOrder: "asc" } },
        requirements: { orderBy: { displayOrder: "asc" } },
        benefits: { orderBy: { displayOrder: "asc" } },
      },
    }),
    prisma.sector.findMany({ orderBy: { label: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!job) notFound();

  const initialValues: JobEditorInitialValues = {
    title: job.title,
    sectorId: job.sectorId,
    clientId: job.clientId ?? "",
    employmentType: job.employmentType,
    overview: job.overview,
    townOrCity: job.townOrCity,
    countyOrRegion: job.countyOrRegion ?? "",
    postcode: job.postcode ?? "",
    payType: job.payType,
    payRates: job.payRates.map((rate) => ({
      label: rate.label ?? "",
      minimum: rate.minimum.toString(),
      maximum: rate.maximum?.toString() ?? "",
      period: rate.period,
      isPrimary: rate.isPrimary,
    })),
    additionalPayInformation: job.additionalPayInformation ?? "",
    referenceCode: job.referenceCode ?? "",
    shortDescription: job.shortDescription ?? "",
    startDate: toDateInputValue(job.startDate),
    closingDate: toDateInputValue(job.closingDate),
    vacancyCount: job.vacancyCount?.toString() ?? "",
    hoursPerWeek: job.hoursPerWeek?.toString() ?? "",
    additionalInformation: job.additionalInformation ?? "",
    showPostedDate: job.showPostedDate,
    featured: job.featured,
    shifts: job.shifts.map((shift) => ({
      category: shift.category,
      label: shift.label ?? "",
      startTime: shift.startTime ?? "",
      endTime: shift.endTime ?? "",
      days: shift.days ?? "",
      details: shift.details ?? "",
    })),
    responsibilities: job.responsibilities.map((entry) => ({ text: entry.text })),
    requirements: job.requirements.map((entry) => ({ text: entry.text })),
    benefits: job.benefits.map((entry) => ({ text: entry.text })),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-primary">Edit job</h1>
      <JobEditor mode="edit" jobId={job.id} sectors={sectors} clients={clients} initialValues={initialValues} />
    </div>
  );
}
