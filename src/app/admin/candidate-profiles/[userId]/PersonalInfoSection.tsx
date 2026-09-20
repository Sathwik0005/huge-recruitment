"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateCandidateStep1 } from "./actions";
import { MaskedField } from "./MaskedField";

const TITLES = ["MR", "MRS", "MISS", "MS", "DR", "OTHER"] as const;
const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

const inputClass =
  "w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
const labelClass = "text-label-md text-on-surface-variant block mb-1";
const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type PersonalInfoValues = {
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  surname: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  niNumber: string | null;
  isStudying: boolean | null;
  hasUnspentConvictions: boolean | null;
  mobileDialCode: string | null;
  mobileNumber: string | null;
};

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function toBoolSelectValue(value: boolean | null): string {
  if (value === null) return "";
  return value ? "true" : "false";
}

export function PersonalInfoSection({ userId, values }: { userId: string; values: PersonalInfoValues }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState({
    title: values.title ?? "",
    firstName: values.firstName ?? "",
    middleName: values.middleName ?? "",
    surname: values.surname ?? "",
    gender: values.gender ?? "",
    dateOfBirth: toDateInputValue(values.dateOfBirth),
    nationality: values.nationality ?? "",
    niNumber: values.niNumber ?? "",
    isStudying: toBoolSelectValue(values.isStudying),
    hasUnspentConvictions: toBoolSelectValue(values.hasUnspentConvictions),
    mobileDialCode: values.mobileDialCode ?? "",
    mobileNumber: values.mobileNumber ?? "",
  });

  function startEditing() {
    setError(undefined);
    setDraft({
      title: values.title ?? "",
      firstName: values.firstName ?? "",
      middleName: values.middleName ?? "",
      surname: values.surname ?? "",
      gender: values.gender ?? "",
      dateOfBirth: toDateInputValue(values.dateOfBirth),
      nationality: values.nationality ?? "",
      niNumber: values.niNumber ?? "",
      isStudying: toBoolSelectValue(values.isStudying),
      hasUnspentConvictions: toBoolSelectValue(values.hasUnspentConvictions),
      mobileDialCode: values.mobileDialCode ?? "",
      mobileNumber: values.mobileNumber ?? "",
    });
    setIsEditing(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateCandidateStep1(userId, {
        title: draft.title || undefined,
        firstName: draft.firstName || undefined,
        middleName: draft.middleName || undefined,
        surname: draft.surname || undefined,
        gender: draft.gender || undefined,
        dateOfBirth: draft.dateOfBirth || undefined,
        nationality: draft.nationality || undefined,
        niNumber: draft.niNumber || undefined,
        isStudying: draft.isStudying === "" ? undefined : draft.isStudying === "true",
        hasUnspentConvictions: draft.hasUnspentConvictions === "" ? undefined : draft.hasUnspentConvictions === "true",
        mobileDialCode: draft.mobileDialCode || undefined,
        mobileNumber: draft.mobileNumber || undefined,
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
          <h2 className="text-headline-sm text-on-surface">Personal Information</h2>
          <button type="button" onClick={startEditing} className="text-label-md text-primary font-bold hover:underline">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Title" value={values.title} />
          <Field label="First Name" value={values.firstName} />
          <Field label="Middle Name" value={values.middleName} />
          <Field label="Surname" value={values.surname} />
          <Field label="Gender" value={values.gender} />
          <Field label="Date of Birth" value={values.dateOfBirth ? values.dateOfBirth.toLocaleDateString("en-GB") : null} />
          <Field label="Nationality" value={values.nationality} />
          <MaskedField label="NI Number" value={values.niNumber} />
          <Field label="Currently Studying" value={boolLabel(values.isStudying)} />
          <Field label="Unspent Convictions" value={boolLabel(values.hasUnspentConvictions)} />
          <Field
            label="Mobile"
            value={values.mobileDialCode && values.mobileNumber ? `${values.mobileDialCode} ${values.mobileNumber}` : null}
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <h2 className="text-headline-sm text-on-surface">Personal Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Title</label>
          <select className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}>
            <option value="">—</option>
            {TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>First Name</label>
          <input className={inputClass} value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Middle Name</label>
          <input
            className={inputClass}
            value={draft.middleName}
            onChange={(e) => setDraft({ ...draft, middleName: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Surname</label>
          <input className={inputClass} value={draft.surname} onChange={(e) => setDraft({ ...draft, surname: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <select className={inputClass} value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Date of Birth</label>
          <input
            type="date"
            className={inputClass}
            value={draft.dateOfBirth}
            onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Nationality</label>
          <input
            className={inputClass}
            value={draft.nationality}
            onChange={(e) => setDraft({ ...draft, nationality: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>NI Number</label>
          <input className={inputClass} value={draft.niNumber} onChange={(e) => setDraft({ ...draft, niNumber: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Currently Studying</label>
          <select
            className={inputClass}
            value={draft.isStudying}
            onChange={(e) => setDraft({ ...draft, isStudying: e.target.value })}
          >
            <option value="">—</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Unspent Convictions</label>
          <select
            className={inputClass}
            value={draft.hasUnspentConvictions}
            onChange={(e) => setDraft({ ...draft, hasUnspentConvictions: e.target.value })}
          >
            <option value="">—</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Dial Code</label>
          <input
            className={inputClass}
            value={draft.mobileDialCode}
            onChange={(e) => setDraft({ ...draft, mobileDialCode: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Mobile Number</label>
          <input
            className={inputClass}
            value={draft.mobileNumber}
            onChange={(e) => setDraft({ ...draft, mobileNumber: e.target.value })}
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
    </form>
  );
}

function boolLabel(value: boolean | null): string | null {
  if (value === null) return null;
  return value ? "Yes" : "No";
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value || "—"}</p>
    </div>
  );
}
