import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)]">
          <div className="mb-6 text-center">
            <h1 className="text-headline-lg text-primary mb-2">Forgot your password?</h1>
            <p className="text-body-md text-secondary">
              Request a secure link to choose a new password
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