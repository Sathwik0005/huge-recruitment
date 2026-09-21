"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 160;

interface SignaturePadProps {
  /** Signed URL of a previously saved signature, or null if none exists yet. */
  initialSignatureUrl: string | null;
  onSaved: () => void;
  disabled?: boolean;
}

/**
 * Draw-to-sign control for Step 4's Employee Declaration, separate from the
 * "Full Name" text field. Uploads immediately on "Save Signature" (same
 * own-upload-then-report-back pattern as `DocumentDropzone.tsx`) rather than
 * being bundled into the form's own submit payload, so the drawn signature
 * survives even if the candidate doesn't finish the rest of the step yet.
 */
export function SignaturePad({ initialSignatureUrl, onSaved, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [editing, setEditing] = useState(!initialSignatureUrl);
  const [hasStroke, setHasStroke] = useState(false);
  // True right after a successful save, within the same session (canvas
  // still visible with its ink intact) — freezes drawing so an accidental
  // stray touch/click on the pad doesn't add stray lines to an already-saved
  // signature. "Edit" explicitly re-opens it for more strokes or a Clear.
  const [locked, setLocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  function getPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled || locked) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(event);
    ctx.strokeStyle = "#1a2b4c";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    setError(undefined);
  }

  function handleRedraw() {
    setEditing(true);
    setError(undefined);
  }

  function handleEdit() {
    setLocked(false);
    setError(undefined);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) {
      setError("Please draw your signature first.");
      return;
    }
    setError(undefined);
    setUploading(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        setError("Could not save the signature. Please try again.");
        return;
      }
      const formData = new FormData();
      formData.set("file", blob, "signature.png");
      const response = await fetch("/api/candidate/profile/step-4/signature", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save the signature. Please try again.");
        return;
      }
      setLocked(true);
      onSaved();
    } finally {
      setUploading(false);
    }
  }

  if (!editing && initialSignatureUrl) {
    return (
      <div className="space-y-2">
        <div className="bg-white border border-surface-container-high rounded-lg p-2 flex items-center justify-center h-40">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed S3 URL, not an optimizable static asset */}
          <img src={initialSignatureUrl} alt="Your saved signature" className="max-h-full max-w-full object-contain" />
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleRedraw}
            className="text-label-sm font-bold text-candidate-navy-dark hover:underline"
          >
            Redraw signature
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        aria-label="Draw your signature here"
        className={`w-full h-40 bg-white border border-surface-container-high rounded-lg touch-none ${
          locked ? "cursor-not-allowed" : "cursor-crosshair"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {locked ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-label-sm font-bold text-candidate-navy-dark">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              check_circle
            </span>
            Signature Saved
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={handleEdit}
              className="h-9 px-4 rounded-lg bg-surface-container-low text-candidate-text-heading text-label-sm font-bold hover:bg-surface-container transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || uploading}
            className="h-9 px-4 rounded-lg bg-surface-container-low text-candidate-text-heading text-label-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || uploading || !hasStroke}
            className="h-9 px-4 rounded-lg bg-candidate-navy-dark hover:bg-candidate-secondary text-white text-label-sm font-bold transition-colors disabled:opacity-60"
          >
            {uploading ? "Saving..." : "Save Signature"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" aria-live="assertive" className="text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
