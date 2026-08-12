import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin-session";
import AdminNav from "./AdminNav";

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

  return (
    <div className="flex-1 flex flex-col">
      <AdminNav />
      <div className="max-w-container-max mx-auto w-full flex-1 px-margin-mobile py-8 md:px-margin-desktop">
        {children}
      </div>
    </div>
  );
}
