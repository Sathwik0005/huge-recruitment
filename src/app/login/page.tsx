import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)]">
          <div className="mb-6 text-center">
            <h1 className="text-headline-lg text-primary mb-2">Welcome back</h1>
            <p className="text-body-md text-secondary">
              Elevate your career with specialist guidance
            </p>
          </div>
          <LoginForm />
          <div className="mt-8 text-center">
            <p className="text-body-md text-secondary">
              New to Huge Requirements Limited?{" "}
              <a className="text-primary font-bold hover:underline" href="/register">
                Register now
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
