"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface CameraCaptureModalProps {
  open: boolean;
  title: string;
  /** "user" for a selfie-style profile photo, "environment" for photographing a physical document. */
  facingMode: "user" | "environment";
  onClose: () => void;
  onCapture: (file: File) => void;
}

/**
 * Live in-page webcam capture (getUserMedia + canvas snapshot). Used instead
 * of a plain `<input capture>` because that attribute is mobile-only in
 * practice — desktop browsers ignore it and just open the regular file
 * picker, which isn't a real "take a photo" experience.
 */
export function CameraCaptureModal({ open, title, facingMode, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function startCamera() {
      setError(undefined);
      setReady(false);

      if (!window.isSecureContext) {
        if (!cancelled) setError("Camera capture requires HTTPS. Please use Upload instead.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setError("This browser doesn't support camera capture (navigator.mediaDevices.getUserMedia is unavailable). Please use Upload instead.");
        }
        console.error("[CameraCaptureModal] getUserMedia unsupported", {
          hasMediaDevices: !!navigator.mediaDevices,
          hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
          isSecureContext: window.isSecureContext,
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;

        const name = err instanceof DOMException ? err.name : "UnknownError";
        const message = err instanceof Error ? err.message : String(err);
        console.error("[CameraCaptureModal] getUserMedia failed", { name, message, facingMode });

        const FRIENDLY_MESSAGES: Record<string, string> = {
          NotAllowedError: "Camera access was blocked or denied. Allow camera access for this site in your browser's address-bar permissions, or use Upload instead.",
          NotFoundError: "No camera was found on this device. Please use Upload instead.",
          NotReadableError: "The camera is already in use by another app or tab. Close it and try again, or use Upload instead.",
          OverconstrainedError: "No camera on this device matches the requested settings. Please use Upload instead.",
          SecurityError: "Camera access is blocked by this site's security settings. Please use Upload instead.",
        };
        setError(FRIENDLY_MESSAGES[name] ?? `Could not access the camera (${name}: ${message}). Please use Upload instead.`);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, facingMode]);

  function handleClose() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onClose();
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container-high">
          <span className="text-label-lg font-bold text-candidate-text-heading">{title}</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close camera"
            className="text-candidate-secondary hover:text-candidate-text-heading"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error ? (
            <p role="alert" aria-live="assertive" className="text-label-sm text-error text-center py-8">
              {error}
            </p>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-label-sm">
                  Starting camera...
                </div>
              )}
            </div>
          )}

          {!error && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!ready}
                className="w-16 h-16 rounded-full bg-candidate-navy-dark hover:bg-candidate-secondary disabled:opacity-40 flex items-center justify-center transition-colors shadow-md"
                aria-label="Capture photo"
              >
                <span className="material-symbols-outlined text-white text-[28px]" aria-hidden="true">
                  photo_camera
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
