"use client";

import { useRef, useState } from "react";

interface AvatarUploadProps {
  initialAvatarUrl: string | null;
}

export function AvatarUpload({ initialAvatarUrl }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const objectUrlRef = useRef<string>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(undefined);

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setAvatarUrl(previewUrl);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("avatar", file);
      const response = await fetch("/api/candidate/profile/avatar", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not upload the photo. Please try again.");
        return;
      }

      setAvatarUrl(data.avatarUrl);
    } catch {
      setError("Could not upload the photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative group shrink-0 w-24 h-24 sm:w-28 sm:h-28">
        <div className="w-full h-full rounded-full bg-candidate-navy-surface flex items-center justify-center overflow-hidden shadow-xl ring-2 ring-candidate-electric-blue/40 relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed S3 URL, not an optimizable static asset
            <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[40px] text-white/80" aria-hidden="true">
              person
            </span>
          )}
          <label
            htmlFor="avatar-upload"
            className="absolute inset-0 bg-candidate-navy-dark/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-center p-2"
          >
            <span className="material-symbols-outlined text-[24px] text-white mb-1" aria-hidden="true">
              photo_camera
            </span>
            <span className="text-[11px] font-bold text-white uppercase tracking-wide">
              {uploading ? "Uploading..." : "Update"}
            </span>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </div>
      </div>
      {error && (
        <p role="alert" aria-live="assertive" className="text-label-sm text-error max-w-[9rem]">
          {error}
        </p>
      )}
    </div>
  );
}
