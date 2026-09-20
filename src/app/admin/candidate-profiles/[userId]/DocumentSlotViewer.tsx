"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentSlot } from "@/lib/candidate-documents";
import { clearCandidateDocument, getDocumentViewUrl } from "./actions";

export function DocumentSlotViewer({
  userId,
  slot,
  label,
  originalFilename,
  hasDocument,
  accept,
}: {
  userId: string;
  slot: DocumentSlot;
  label: string;
  originalFilename: string | null;
  hasDocument: boolean;
  accept: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleView() {
    setError(undefined);
    startTransition(async () => {
      const result = await getDocumentViewUrl(userId, slot);
      if (!result.success) {
        setError(result.error);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

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
      formData.append("slot", slot);
      formData.append("file", file);
      const response = await fetch(`/api/admin/candidate-profiles/${userId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not upload the file. Please try again.");
        return;
      }
      router.refresh();
    });
  }

  function handleClear() {
    setError(undefined);
    startTransition(async () => {
      const result = await clearCandidateDocument(userId, slot);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-outline-variant p-4 space-y-2">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{hasDocument ? (originalFilename ?? "Uploaded") : "Not uploaded"}</p>
      <div className="flex flex-wrap gap-2">
        {hasDocument && (
          <button
            type="button"
            onClick={handleView}
            disabled={pending}
            className="h-9 px-3 rounded-lg border border-primary text-primary font-bold text-label-sm hover:bg-primary/10 transition-colors disabled:opacity-60"
          >
            View
          </button>
        )}
        <button
          type="button"
          onClick={handleReplaceClick}
          disabled={pending}
          className="h-9 px-3 rounded-lg border border-outline-variant text-on-surface font-bold text-label-sm hover:bg-surface-container-lowest transition-colors disabled:opacity-60"
        >
          {hasDocument ? "Replace" : "Upload"}
        </button>
        {hasDocument && (
          <button
            type="button"
            onClick={handleClear}
            disabled={pending}
            className="h-9 px-3 rounded-lg border border-error text-error font-bold text-label-sm hover:bg-error/10 transition-colors disabled:opacity-60"
          >
            Clear
          </button>
        )}
      </div>
      {error && <p className="text-label-sm text-error">{error}</p>}
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
    </div>
  );
}
