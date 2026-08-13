import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { JobEditor } from "../JobEditor";

export default async function NewJobPage() {
  const session = await requireAdminSession();
  if (session.status !== "ok") redirect(session.status === "forbidden" ? "/" : "/login");

  const [sectors, clients] = await Promise.all([
    prisma.sector.findMany({ orderBy: { label: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-primary">New job</h1>
      <JobEditor mode="create" sectors={sectors} clients={clients} />
    </div>
  );
}
