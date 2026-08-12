import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { JobEditor } from "../JobEditor";

export default async function NewJobPage() {
  const session = await requireAdminSession();
  if (session.status !== "ok") redirect(session.status === "forbidden" ? "/" : "/login");

  const sectors = await prisma.sector.findMany({ where: { isActive: true }, orderBy: { label: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-primary">New job</h1>
      <JobEditor mode="create" sectors={sectors} />
    </div>
  );
}
