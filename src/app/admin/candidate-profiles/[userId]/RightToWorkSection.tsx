"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateCandidateStep3 } from "./actions";
import { DocumentSlotViewer } from "./DocumentSlotViewer";

const DOC_TYPES = ["PASSPORT", "ID_CARD", "BRP_EVISA"] as const;
const BRP_SUBTYPES = ["PHYSICAL_BRP", "EVISA"] as const;

const inputClass =
  "w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
const labelClass = "text-label-md text-on-surface-variant block mb-1";
const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type RightToWorkValues = {
  rightToWorkDocumentType: string | null;
  brpSubtype: string | null;
  visaExpiryDate: Date | null;
  rightToWorkShareCode: string | null;
  rightToWorkShareCodeExpiryDate: Date | null;
  rightToWorkDocFrontOriginalFilename: string | null;
  rightToWorkDocBackOriginalFilename: string | null;
  hasRightToWorkDocFront: boolean;
  hasRightToWorkDocBack: boolean;
};

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function draftFrom(values: RightToWorkValues) {
  return {
    rightToWorkDocumentType: values.rightToWorkDocumentType ?? "",
    brpSubtype: values.brpSubtype ?? "",
    visaExpiryDate: toDateInputValue(values.visaExpiryDate),
    rightToWorkShareCode: values.rightToWorkShareCode ?? "",
    rightToWorkShareCodeExpiryDate: toDateInputValue(values.rightToWorkShareCodeExpiryDate),
  };
}

/**
 * Shows/edits which fields apply based on `rightToWorkDocumentType`/`brpSubtype`
 * — the same branching Step3Form.tsx uses on the candidate's own wizard.
 */
export function RightToWorkSection({ userId, values }: { userId: string; values: RightToWorkValues }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState(draftFrom(values));

  function startEditing() {
    setError(undefined);
    setDraft(draftFrom(values));
    setIsEditing(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateCandidateStep3(userId, {
        rightToWorkDocumentType: draft.rightToWorkDocumentType || undefined,
        brpSubtype: draft.brpSubtype || undefined,
        visaExpiryDate: draft.visaExpiryDate || undefined,
        rightToWorkShareCode: draft.rightToWorkShareCode || undefined,
        rightToWorkShareCodeExpiryDate: draft.rightToWorkShareCodeExpiryDate || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  const docType = isEditing ? draft.rightToWorkDocumentType : values.rightToWorkDocumentType;
  const brpSubtype = isEditing ? draft.brpSubtype : values.brpSubtype;
  const showDocs = docType === "PASSPORT" || docType === "ID_CARD" || (docType === "BRP_EVISA" && brpSubtype === "PHYSICAL_BRP");
  const showShareCode = docType === "PASSPORT" || docType === "ID_CARD" || (docType === "BRP_EVISA" && brpSubtype === "EVISA");
  const showShareCodeExpiry = docType === "ID_CARD" || (docType === "BRP_EVISA" && brpSubtype === "EVISA");

  if (!isEditing) {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-on-surface">Right to Work</h2>
          <button type="button" onClick={startEditing} className="text-label-md text-primary font-bold hover:underline">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Document Type" value={values.rightToWorkDocumentType} />
          {values.rightToWorkDocumentType === "BRP_EVISA" && <Field label="BRP Subtype" value={values.brpSubtype} />}
          {values.rightToWorkDocumentType === "PASSPORT" && (
            <Field label="Visa Expiry Date" value={values.visaExpiryDate ? values.visaExpiryDate.toLocaleDateString("en-GB") : null} />
          )}
          {showShareCode && <Field label="Right to Work Share Code" value={values.rightToWorkShareCode} />}
          {showShareCodeExpiry && (
            <Field
              label="Share Code Expiry Date"
              value={values.rightToWorkShareCodeExpiryDate ? values.rightToWorkShareCodeExpiryDate.toLocaleDateString("en-GB") : null}
            />
          )}
        </div>
        {showDocs && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DocumentSlotViewer
              userId={userId}
              slot="rightToWorkFront"
              label="Document Front"
              originalFilename={values.rightToWorkDocFrontOriginalFilename}
              hasDocument={values.hasRightToWorkDocFront}
              accept="image/jpeg,image/png,application/pdf"
            />
            <DocumentSlotViewer
              userId={userId}
              slot="rightToWorkBack"
              label="Document Back"
              originalFilename={values.rightToWorkDocBackOriginalFilename}
              hasDocument={values.hasRightToWorkDocBack}
              accept="image/jpeg,image/png,application/pdf"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <h2 className="text-headline-sm text-on-surface">Right to Work</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Document Type</label>
          <select
            className={inputClass}
            value={draft.rightToWorkDocumentType}
            onChange={(e) => setDraft({ ...draft, rightToWorkDocumentType: e.target.value })}
          >
            <option value="">—</option>
            {DOC_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {draft.rightToWorkDocumentType === "BRP_EVISA" && (
          <div>
            <label className={labelClass}>BRP Subtype</label>
            <select className={inputClass} value={draft.brpSubtype} onChange={(e) => setDraft({ ...draft, brpSubtype: e.target.value })}>
              <option value="">—</option>
              {BRP_SUBTYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
        {draft.rightToWorkDocumentType === "PASSPORT" && (
          <div>
            <label className={labelClass}>Visa Expiry Date</label>
            <input
              type="date"
              className={inputClass}
              value={draft.visaExpiryDate}
              onChange={(e) => setDraft({ ...draft, visaExpiryDate: e.target.value })}
            />
          </div>
        )}
        {showShareCode && (
          <div>
            <label className={labelClass}>Right to Work Share Code</label>
            <input
              className={inputClass}
              value={draft.rightToWorkShareCode}
              onChange={(e) => setDraft({ ...draft, rightToWorkShareCode: e.target.value })}
            />
          </div>
        )}
        {showShareCodeExpiry && (
          <div>
            <label className={labelClass}>Share Code Expiry Date</label>
            <input
              type="date"
              className={inputClass}
              value={draft.rightToWorkShareCodeExpiryDate}
              onChange={(e) => setDraft({ ...draft, rightToWorkShareCodeExpiryDate: e.target.value })}
            />
          </div>
        )}
      </div>
      {error && <p className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-4 bg-primary text-on-primary text-label-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          disabled={pending}
          className="h-10 px-4 border border-outline-variant text-on-surface text-label-md font-bold rounded-lg hover:bg-surface-container-lowest transition-all disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {showDocs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DocumentSlotViewer
            userId={userId}
            slot="rightToWorkFront"
            label="Document Front"
            originalFilename={values.rightToWorkDocFrontOriginalFilename}
            hasDocument={values.hasRightToWorkDocFront}
            accept="image/jpeg,image/png,application/pdf"
          />
          <DocumentSlotViewer
            userId={userId}
            slot="rightToWorkBack"
            label="Document Back"
            originalFilename={values.rightToWorkDocBackOriginalFilename}
            hasDocument={values.hasRightToWorkDocBack}
            accept="image/jpeg,image/png,application/pdf"
          />
        </div>
      )}
    </form>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value || "—"}</p>
    </div>
  );
}
