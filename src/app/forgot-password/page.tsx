import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)]">
          <div className="mb-6 text-center">
            <h1 className="text-headline-lg text-primary mb-2">Reset your password</h1>
            <p className="text-body-md text-secondary">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>
          <ForgotPasswordForm />
          <div className="mt-8 text-center">
            <p className="text-body-md text-secondary">
              Remembered your password?{" "}
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
