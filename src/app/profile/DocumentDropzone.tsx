"use client";

import { useRef, useState } from "react";
import type { DocumentSlot } from "@/lib/candidate-documents";

interface DocumentDropzoneProps {
  slot: DocumentSlot;
  label: string;
  required?: boolean;
  accept: string;
  acceptHint: string;
  helperText?: string;
  initialFilename?: string | null;
  onUploaded: (key: string, originalFilename: string) => void;
  onRemove?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Shared upload control for Step 3's three document slots (right-to-work
 * front/back, bank statement). Adapted from `AvatarUpload.tsx`'s click-to-
 * browse/FormData upload mechanics, with one deliberate deviation: this
 * component reports a successful upload back to its parent via `onUploaded`.
 * Unlike the avatar (which isn't part of any step's submitted payload), these
 * document keys are required fields inside `Step3Form`'s own state/validation,
 * so the parent needs to learn about a completed upload.
 */
export function DocumentDropzone({
  slot,
  label,
  required,
  accept,
  acceptHint,
  helperText,
  initialFilename,
  onUploaded,
  onRemove,
}: DocumentDropzoneProps) {
  const [filename, setFilename] = useState<string | null>(initialFilename ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const inputId = `document-dropzone-${slot}`;
  const objectUrlRef = useRef<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(undefined);
    setFileSize(file.size);

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("slot", slot);
      formData.set("file", file);
      const response = await fetch("/api/candidate/profile/step-3/documents", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not upload the file. Please try again.");
        return;
      }

      setFilename(data.originalFilename ?? file.name);
      onUploaded(data.s3Key, data.originalFilename ?? file.name);
    } catch {
      setError("Could not upload the file. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPreviewUrl(null);
    setFilename(null);
    setFileSize(null);
    setError(undefined);
    onRemove?.();
  }

  return (
    <div className="flex flex-col">
      <span className="text-label-md text-candidate-text-heading mb-1.5">
        {label} {required && <span className="text-error">*</span>}
      </span>

      {filename ? (
        <div className="flex items-center justify-between p-2.5 bg-surface-container-low border border-surface-container-high rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- transient local object URL preview, not an optimizable static asset
              <img src={previewUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
            ) : (
              <span className="w-8 h-8 bg-error-container text-on-error-container rounded flex items-center justify-center text-[10px] font-bold shrink-0">
                PDF
              </span>
            )}
            <div className="min-w-0">
              <p className="text-label-sm font-medium text-candidate-text-heading truncate">{filename}</p>
              {fileSize !== null && <p className="text-label-sm text-candidate-secondary">{formatBytes(fileSize)}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove attachment"
            className="text-candidate-secondary hover:text-error p-1 text-label-md font-semibold transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="rounded-xl p-5 flex flex-col items-center justify-center text-center bg-surface-container-low border border-dashed border-surface-container-high hover:border-candidate-secondary hover:bg-surface-container cursor-pointer h-40 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-surface-container text-candidate-navy-dark flex items-center justify-center mb-2.5">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              upload
            </span>
          </div>
          <p className="text-label-sm font-semibold text-candidate-text-heading">
            {uploading ? "Uploading..." : "Click to browse"}
          </p>
          {helperText && <p className="text-label-sm text-candidate-secondary mt-0.5">{helperText}</p>}
          <p className="text-label-sm text-candidate-secondary mt-2">{acceptHint}</p>
          <input
            id={inputId}
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
      )}

      {error && (
        <p role="alert" aria-live="assertive" className="text-label-sm text-error mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
