"use client";

import { createPortal } from "react-dom";

interface UploadChoiceModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onChooseCamera: () => void;
  onChooseUpload: () => void;
}

/** Asks the candidate to pick "Take Photo" or "Upload" before either the live camera or the file picker opens. */
export function UploadChoiceModal({ open, title, onClose, onChooseCamera, onChooseUpload }: UploadChoiceModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container-high">
          <span className="text-label-lg font-bold text-candidate-text-heading">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-candidate-secondary hover:text-candidate-text-heading"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onChooseCamera}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[28px] text-candidate-navy-dark" aria-hidden="true">
              photo_camera
            </span>
            <span className="text-label-sm font-semibold text-candidate-text-heading">Take Photo</span>
          </button>
          <button
            type="button"
            onClick={onChooseUpload}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[28px] text-candidate-navy-dark" aria-hidden="true">
              upload
            </span>
            <span className="text-label-sm font-semibold text-candidate-text-heading">Upload</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
