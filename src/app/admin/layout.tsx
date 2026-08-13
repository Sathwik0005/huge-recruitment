import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin-session";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const result = await requireAdminSession();

  switch (result.status) {
    case "unauthenticated":
    case "unverified":
    case "no-db-user":
      redirect("/login");
    case "forbidden":
      redirect("/");
  }

  return <AdminShell user={result.user}>{children}</AdminShell>;
}
