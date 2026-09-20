"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCandidateWorkReferences } from "./actions";

const inputClass =
  "w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
const labelClass = "text-label-md text-on-surface-variant block mb-1";
const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type WorkReference = {
  id?: string;
  jobTitle: string;
  companyName: string;
  companyAddress: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  isCurrentJob: boolean;
  managerName: string | null;
  managerMobile: string | null;
  managerEmail: string | null;
};

type ReferenceDraft = {
  jobTitle: string;
  companyName: string;
  companyAddress: string;
  startDate: string;
  endDate: string;
  isCurrentJob: boolean;
  managerName: string;
  managerMobile: string;
  managerEmail: string;
};

const emptyDraft: ReferenceDraft = {
  jobTitle: "",
  companyName: "",
  companyAddress: "",
  startDate: "",
  endDate: "",
  isCurrentJob: false,
  managerName: "",
  managerMobile: "",
  managerEmail: "",
};

function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

function referenceToDraft(reference: WorkReference): ReferenceDraft {
  return {
    jobTitle: reference.jobTitle,
    companyName: reference.companyName,
    companyAddress: reference.companyAddress ?? "",
    startDate: toDateInputValue(reference.startDate),
    endDate: toDateInputValue(reference.endDate),
    isCurrentJob: reference.isCurrentJob,
    managerName: reference.managerName ?? "",
    managerMobile: reference.managerMobile ?? "",
    managerEmail: reference.managerEmail ?? "",
  };
}

export function WorkReferencesManager({
  userId,
  initialReferences,
}: {
  userId: string;
  initialReferences: WorkReference[];
}) {
  const router = useRouter();
  const [references, setReferences] = useState<WorkReference[]>(initialReferences);
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<ReferenceDraft>(emptyDraft);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function toggleExpanded(index: number) {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }

  function openNew() {
    setDraft(emptyDraft);
    setEditingIndex("new");
  }

  function openEdit(index: number) {
    setDraft(referenceToDraft(references[index]));
    setEditingIndex(index);
  }

  function saveDraft() {
    const reference: WorkReference = {
      jobTitle: draft.jobTitle,
      companyName: draft.companyName,
      companyAddress: draft.companyAddress || null,
      startDate: draft.startDate,
      endDate: draft.isCurrentJob ? null : draft.endDate || null,
      isCurrentJob: draft.isCurrentJob,
      managerName: draft.managerName || null,
      managerMobile: draft.managerMobile || null,
      managerEmail: draft.managerEmail || null,
    };

    if (editingIndex === "new") {
      setReferences((prev) => [...prev, reference]);
    } else if (typeof editingIndex === "number") {
      setReferences((prev) => prev.map((r, i) => (i === editingIndex ? { ...r, ...reference } : r)));
    }
    setDirty(true);
    setEditingIndex(null);
  }

  function deleteReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function handleSaveChanges() {
    setError(undefined);
    startTransition(async () => {
      const result = await updateCandidateWorkReferences(
        userId,
        references.map((r) => ({
          jobTitle: r.jobTitle,
          companyName: r.companyName,
          companyAddress: r.companyAddress || undefined,
          startDate: toDateInputValue(r.startDate),
          endDate: r.isCurrentJob ? undefined : toDateInputValue(r.endDate) || undefined,
          isCurrentJob: r.isCurrentJob,
          managerName: r.managerName || undefined,
          managerMobile: r.managerMobile || undefined,
          managerEmail: r.managerEmail || undefined,
        })),
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDirty(false);
      router.refresh();
    });
  }

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm text-on-surface">Work References</h2>
        {editingIndex === null && (
          <button type="button" onClick={openNew} className="text-label-md text-primary font-bold hover:underline">
            + Add Reference
          </button>
        )}
      </div>

      {references.length === 0 && editingIndex === null && (
        <p className="text-body-md text-on-surface-variant">No work references on file.</p>
      )}

      <div className="space-y-3">
        {references.map((reference, index) =>
          editingIndex === index ? null : (
            <div key={reference.id ?? index} className="rounded-lg border border-outline-variant p-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-bold text-on-surface">
                    {reference.jobTitle} — {reference.companyName}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {toDateInputValue(reference.startDate)} to{" "}
                    {reference.isCurrentJob ? "Present" : toDateInputValue(reference.endDate)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(index)}
                    className="text-label-sm text-primary font-bold hover:underline"
                  >
                    {expandedIndex === index ? "Close" : "View"}
                  </button>
                  <button type="button" onClick={() => openEdit(index)} className="text-label-sm text-primary font-bold hover:underline">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteReference(index)}
                    className="text-label-sm text-error font-bold hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedIndex === index && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-outline-variant">
                  <div>
                    <p className={labelClass}>Company Address</p>
                    <p className="text-body-md text-on-surface">{reference.companyAddress || "—"}</p>
                  </div>
                  <div>
                    <p className={labelClass}>Manager Name</p>
                    <p className="text-body-md text-on-surface">{reference.managerName || "—"}</p>
                  </div>
                  <div>
                    <p className={labelClass}>Manager Mobile</p>
                    <p className="text-body-md text-on-surface">{reference.managerMobile || "—"}</p>
                  </div>
                  <div>
                    <p className={labelClass}>Manager Email</p>
                    <p className="text-body-md text-on-surface">{reference.managerEmail || "—"}</p>
                  </div>
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {editingIndex !== null && (
        <div className="rounded-lg border border-outline-variant p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Job Title</label>
              <input className={inputClass} value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                className={inputClass}
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Company Address</label>
              <input
                className={inputClass}
                value={draft.companyAddress}
                onChange={(e) => setDraft({ ...draft, companyAddress: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                className={inputClass}
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input
                type="date"
                className={inputClass}
                disabled={draft.isCurrentJob}
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
              <input
                type="checkbox"
                checked={draft.isCurrentJob}
                onChange={(e) => setDraft({ ...draft, isCurrentJob: e.target.checked, endDate: e.target.checked ? "" : draft.endDate })}
              />
              This is their current job
            </label>
            <div>
              <label className={labelClass}>Manager Name</label>
              <input
                className={inputClass}
                value={draft.managerName}
                onChange={(e) => setDraft({ ...draft, managerName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Manager Mobile</label>
              <input
                className={inputClass}
                value={draft.managerMobile}
                onChange={(e) => setDraft({ ...draft, managerMobile: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Manager Email</label>
              <input
                className={inputClass}
                value={draft.managerEmail}
                onChange={(e) => setDraft({ ...draft, managerEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="h-10 px-4 bg-primary text-on-primary text-label-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all"
            >
              {editingIndex === "new" ? "Add" : "Update"}
            </button>
            <button
              type="button"
              onClick={() => setEditingIndex(null)}
              className="h-10 px-4 border border-outline-variant text-on-surface text-label-md font-bold rounded-lg hover:bg-surface-container-lowest transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">{error}</p>}

      {dirty && editingIndex === null && (
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={pending}
          className="h-10 px-4 bg-primary text-on-primary text-label-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      )}
    </div>
  );
}
