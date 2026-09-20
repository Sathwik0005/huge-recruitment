"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateCandidateStep1 } from "./actions";

const inputClass =
  "w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
const labelClass = "text-label-md text-on-surface-variant block mb-1";
const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type AddressValues = {
  addressLine1: string | null;
  addressLine2: string | null;
  townOrCity: string | null;
  countyOrRegion: string | null;
  postcode: string | null;
};

function draftFrom(values: AddressValues) {
  return {
    addressLine1: values.addressLine1 ?? "",
    addressLine2: values.addressLine2 ?? "",
    townOrCity: values.townOrCity ?? "",
    countyOrRegion: values.countyOrRegion ?? "",
    postcode: values.postcode ?? "",
  };
}

export function AddressSection({ userId, values }: { userId: string; values: AddressValues }) {
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
      const result = await updateCandidateStep1(userId, {
        addressLine1: draft.addressLine1 || undefined,
        addressLine2: draft.addressLine2 || undefined,
        townOrCity: draft.townOrCity || undefined,
        countyOrRegion: draft.countyOrRegion || undefined,
        postcode: draft.postcode || undefined,
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
          <h2 className="text-headline-sm text-on-surface">Address</h2>
          <button type="button" onClick={startEditing} className="text-label-md text-primary font-bold hover:underline">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Address Line 1" value={values.addressLine1} />
          <Field label="Address Line 2" value={values.addressLine2} />
          <Field label="Town / City" value={values.townOrCity} />
          <Field label="County / Region" value={values.countyOrRegion} />
          <Field label="Postcode" value={values.postcode} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <h2 className="text-headline-sm text-on-surface">Address</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Address Line 1</label>
          <input
            className={inputClass}
            value={draft.addressLine1}
            onChange={(e) => setDraft({ ...draft, addressLine1: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Address Line 2</label>
          <input
            className={inputClass}
            value={draft.addressLine2}
            onChange={(e) => setDraft({ ...draft, addressLine2: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Town / City</label>
          <input
            className={inputClass}
            value={draft.townOrCity}
            onChange={(e) => setDraft({ ...draft, townOrCity: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>County / Region</label>
          <input
            className={inputClass}
            value={draft.countyOrRegion}
            onChange={(e) => setDraft({ ...draft, countyOrRegion: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Postcode</label>
          <input className={inputClass} value={draft.postcode} onChange={(e) => setDraft({ ...draft, postcode: e.target.value })} />
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
