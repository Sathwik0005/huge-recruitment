import { redirect } from "next/navigation";

/**
 * Firebase's "Customize action URL" console setting is project-wide — it
 * applies to every email template (verification, password reset, etc.) at
 * once. This route is the single URL configured there; it forwards each
 * action to its existing dedicated page based on `mode` only. The
 * destination is chosen from this fixed allowlist, never from `continueUrl`
 * or any other caller-supplied value, so this can't become an open redirect.
 */
const ACTION_DESTINATIONS: Record<string, string> = {
  verifyEmail: "/verify-email",
  resetPassword: "/reset-password",
};

const FORWARDED_PARAMS = ["mode", "oobCode", "apiKey", "continueUrl", "lang", "tenantId"] as const;

export default async function AuthActionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const destination = params.mode ? ACTION_DESTINATIONS[params.mode] : undefined;

  if (!destination) {
    return <UnsupportedActionState />;
  }

  const forwarded = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = params[key];
    if (value) forwarded.set(key, value);
  }

  redirect(`${destination}?${forwarded.toString()}`);
}

function UnsupportedActionState() {
  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)] text-center">
          <h1 className="text-headline-lg text-primary mb-2">This link isn&apos;t valid</h1>
          <p role="alert" aria-live="assertive" className="mb-6 text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
            This link is invalid, unsupported, or has already been used. Please request a new one.
          </p>
          <div className="flex flex-col gap-2">
            <a href="/login" className="text-primary font-bold hover:underline">
              Go to login
            </a>
            <a href="/register" className="text-primary font-bold hover:underline">
              Create a new account
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
