import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { NewClientForm } from "./NewClientForm";
import { ClientsTable } from "./ClientsTable";

export default async function AdminClientsPage() {
  const session = await requireAdminSession();
  if (session.status !== "ok") redirect(session.status === "forbidden" ? "/" : "/login");

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/jobs" className="text-label-md text-primary hover:underline">
          ← Back to jobs
        </Link>
        <h1 className="text-headline-lg text-primary mt-2">Employers</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Internal employer records used to link jobs to a client. Not shown publicly.
        </p>
      </div>

      <NewClientForm />
      <ClientsTable clients={clients} />
    </div>
  );
}
