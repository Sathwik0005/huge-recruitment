"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminInitialAvatar } from "@/lib/admin-avatar";
import { clearCandidateAvatar } from "./actions";

export function AvatarEditor({
  userId,
  avatarUrl,
  firstName,
}: {
  userId: string;
  avatarUrl: string | null;
  firstName: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleReplaceClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch(`/api/admin/candidate-profiles/${userId}/avatar`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not upload the photo. Please try again.");
        return;
      }
      router.refresh();
    });
  }

  function handleRemove() {
    setError(undefined);
    startTransition(async () => {
      const result = await clearCandidateAvatar(userId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- freshly signed, short-lived S3 URL, not a static asset Next's Image optimizer should cache
        <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <AdminInitialAvatar firstName={firstName} className="h-16 w-16 text-headline-md" />
      )}
      <div className="space-y-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReplaceClick}
            disabled={pending}
            className="h-9 px-3 rounded-lg border border-primary text-primary font-bold text-label-sm hover:bg-primary/10 transition-colors disabled:opacity-60"
          >
            {pending ? "Saving..." : "Replace"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="h-9 px-3 rounded-lg border border-error text-error font-bold text-label-sm hover:bg-error/10 transition-colors disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="text-label-sm text-error">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
