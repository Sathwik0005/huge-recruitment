"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateCandidateStep3 } from "./actions";
import { MaskedField } from "./MaskedField";
import { DocumentSlotViewer } from "./DocumentSlotViewer";

const inputClass =
  "w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
const labelClass = "text-label-md text-on-surface-variant block mb-1";
const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type BankDetailsValues = {
  bankAccountHolderName: string | null;
  bankAccountNumber: string | null;
  bankSortCode: string | null;
  bankStatementOriginalFilename: string | null;
  hasBankStatement: boolean;
};

function draftFrom(values: BankDetailsValues) {
  return {
    bankAccountHolderName: values.bankAccountHolderName ?? "",
    bankAccountNumber: values.bankAccountNumber ?? "",
    bankSortCode: values.bankSortCode ?? "",
  };
}

export function BankDetailsSection({ userId, values }: { userId: string; values: BankDetailsValues }) {
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
        bankAccountHolderName: draft.bankAccountHolderName || undefined,
        bankAccountNumber: draft.bankAccountNumber || undefined,
        bankSortCode: draft.bankSortCode || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  if (!isEditing) {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-on-surface">Bank Details</h2>
          <button type="button" onClick={startEditing} className="text-label-md text-primary font-bold hover:underline">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Account Holder Name" value={values.bankAccountHolderName} />
          <MaskedField label="Account Number" value={values.bankAccountNumber} />
          <MaskedField label="Sort Code" value={values.bankSortCode} />
        </div>
        <DocumentSlotViewer
          userId={userId}
          slot="bankStatement"
          label="Bank Statement"
          originalFilename={values.bankStatementOriginalFilename}
          hasDocument={values.hasBankStatement}
          accept="application/pdf"
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <h2 className="text-headline-sm text-on-surface">Bank Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Account Holder Name</label>
          <input
            className={inputClass}
            value={draft.bankAccountHolderName}
            onChange={(e) => setDraft({ ...draft, bankAccountHolderName: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Account Number</label>
          <input
            className={inputClass}
            value={draft.bankAccountNumber}
            onChange={(e) => setDraft({ ...draft, bankAccountNumber: e.target.value.replace(/\D/g, "") })}
            maxLength={8}
          />
        </div>
        <div>
          <label className={labelClass}>Sort Code</label>
          <input
            className={inputClass}
            value={draft.bankSortCode}
            onChange={(e) => setDraft({ ...draft, bankSortCode: e.target.value.replace(/\D/g, "") })}
            maxLength={6}
          />
        </div>
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
      <DocumentSlotViewer
        userId={userId}
        slot="bankStatement"
        label="Bank Statement"
        originalFilename={values.bankStatementOriginalFilename}
        hasDocument={values.hasBankStatement}
        accept="application/pdf"
      />
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
