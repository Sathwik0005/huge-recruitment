"use client";

import { useRef, useState } from "react";
import { UploadChoiceModal } from "./UploadChoiceModal";
import { CameraCaptureModal } from "./CameraCaptureModal";

interface AvatarUploadProps {
  initialAvatarUrl: string | null;
  disabled?: boolean;
  onLockedInteraction?: () => void;
}

export function AvatarUpload({ initialAvatarUrl, disabled = false, onLockedInteraction }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const objectUrlRef = useRef<string>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
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

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) handleFile(file);
  }

  function handleAreaClick() {
    if (disabled) {
      onLockedInteraction?.();
      return;
    }
    if (uploading) return;
    setChoiceOpen(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleAreaClick}
        aria-label={disabled ? "Profile photo (locked)" : "Change profile photo"}
        className="relative group shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full"
      >
        <div className="w-full h-full rounded-full bg-candidate-navy-surface flex items-center justify-center overflow-hidden shadow-xl ring-2 ring-candidate-electric-blue/40 relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed S3 URL, not an optimizable static asset
            <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[40px] text-white/80" aria-hidden="true">
              person
            </span>
          )}
          {disabled ? (
            <div className="absolute inset-0 bg-candidate-navy-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-not-allowed">
              <span className="material-symbols-outlined text-[22px] text-white" aria-hidden="true">
                lock
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-candidate-navy-dark/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-2">
              <span className="material-symbols-outlined text-[24px] text-white mb-1" aria-hidden="true">
                photo_camera
              </span>
              <span className="text-[11px] font-bold text-white uppercase tracking-wide">
                {uploading ? "Uploading..." : "Update"}
              </span>
            </div>
          )}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        disabled={uploading || disabled}
        onChange={handleFileInputChange}
      />

      {error && (
        <p role="alert" aria-live="assertive" className="text-label-sm text-error max-w-[9rem]">
          {error}
        </p>
      )}

      <UploadChoiceModal
        open={choiceOpen}
        title="Update Profile Photo"
        onClose={() => setChoiceOpen(false)}
        onChooseUpload={() => {
          setChoiceOpen(false);
          fileInputRef.current?.click();
        }}
        onChooseCamera={() => {
          setChoiceOpen(false);
          setCameraOpen(true);
        }}
      />

      <CameraCaptureModal
        open={cameraOpen}
        title="Take Profile Photo"
        facingMode="user"
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => {
          setCameraOpen(false);
          handleFile(file);
        }}
      />
    </div>
  );
}
