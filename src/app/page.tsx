import { redirect } from "next/navigation";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { LogoutButton } from "@/components/LogoutButton";

export default async function Home() {
  const result = await requireVerifiedSession();

  if (result.status === "unauthenticated" || result.status === "no-db-user") {
    redirect("/login");
  }
  if (result.status === "unverified") {
    redirect("/verify-email");
  }

  const { user } = result;

  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-gutter py-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-headline-lg text-primary">Welcome, {user.firstName}</h1>
        <LogoutButton />
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
        <p className="text-body-md text-on-surface-variant mb-2">
          Signed in as <span className="font-bold text-on-surface">{user.email}</span>
        </p>
        <p className="text-body-md text-on-surface-variant mb-2">
          Role: <span className="font-bold text-on-surface">{user.role}</span>
        </p>
        <p className="text-body-md text-on-surface-variant">
          Status: <span className="font-bold text-on-surface">{user.status}</span>
        </p>
      </div>
    </main>
  );
}
