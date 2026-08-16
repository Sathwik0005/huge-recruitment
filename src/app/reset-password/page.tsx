import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)]">
          <div className="mb-6 text-center">
            <h1 className="text-headline-lg text-primary mb-2">Choose a new password</h1>
            <p className="text-body-md text-secondary">
              Enter and confirm your new password below
            </p>
          </div>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
