import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex-grow flex items-center justify-center py-20 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)]">
          <div className="mb-8 text-center">
            <h1 className="text-headline-lg text-primary mb-2">Create your account</h1>
            <p className="text-body-md text-secondary">
              Elevate your career with specialist guidance
            </p>
          </div>
          <RegisterForm />
          <div className="mt-8 text-center">
            <p className="text-body-md text-secondary">
              Already have an account?{" "}
              <a className="text-primary font-bold hover:underline" href="/login">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
