"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateCandidateStep2 } from "./actions";

const HOURS_AVAILABILITY = ["ZERO_TO_TEN", "TEN_TO_TWENTY", "TWENTY_TO_THIRTY", "THIRTY_PLUS"] as const;
const AVAILABILITY_TO_START = ["IMMEDIATE", "NEXT_WEEK", "TWO_TO_THREE_WEEKS", "FOUR_WEEKS_PLUS"] as const;
const TRANSPORT_MODES = ["CAR", "BUS", "TAXI", "CYCLE", "WALK", "TRAIN"] as const;
const RELATIONSHIPS = ["SPOUSE_PARTNER", "RELATIVE_FAMILY", "FRIEND", "OTHER"] as const;
const REFERRAL_SOURCES = [
  "INDEED_JOB_BOARD",
  "GOOGLE_SEARCH",
  "SOCIAL_MEDIA",
  "FRIEND_COLLEAGUE_REFERRAL",
  "JOBCENTRE_PLUS",
  "OTHER",
] as const;
const SECTORS = ["PRODUCTION", "WAREHOUSING", "MANUFACTURING", "DISTRIBUTION", "AUTOMOTIVE"] as const;

const inputClass =
  "w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
const labelClass = "text-label-md text-on-surface-variant block mb-1";
const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type WorkPreferencesValues = {
  preferredWorkLocation: string | null;
  hoursAvailability: string | null;
  availabilityToStart: string | null;
  interestedSectors: string[];
  transportMode: string | null;
  shoeSize: number | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  emergencyContactRelationship: string | null;
  referralSource: string | null;
};

function draftFrom(values: WorkPreferencesValues) {
  return {
    preferredWorkLocation: values.preferredWorkLocation ?? "",
    hoursAvailability: values.hoursAvailability ?? "",
    availabilityToStart: values.availabilityToStart ?? "",
    interestedSectors: values.interestedSectors,
    transportMode: values.transportMode ?? "",
    shoeSize: values.shoeSize !== null ? String(values.shoeSize) : "",
    emergencyContactName: values.emergencyContactName ?? "",
    emergencyContactMobile: values.emergencyContactMobile ?? "",
    emergencyContactRelationship: values.emergencyContactRelationship ?? "",
    referralSource: values.referralSource ?? "",
  };
}

export function WorkPreferencesSection({ userId, values }: { userId: string; values: WorkPreferencesValues }) {
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

  function toggleSector(sector: string) {
    setDraft((prev) => ({
      ...prev,
      interestedSectors: prev.interestedSectors.includes(sector)
        ? prev.interestedSectors.filter((s) => s !== sector)
        : [...prev.interestedSectors, sector],
    }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateCandidateStep2(userId, {
        preferredWorkLocation: draft.preferredWorkLocation || undefined,
        hoursAvailability: draft.hoursAvailability || undefined,
        availabilityToStart: draft.availabilityToStart || undefined,
        interestedSectors: draft.interestedSectors.length > 0 ? draft.interestedSectors : undefined,
        transportMode: draft.transportMode || undefined,
        shoeSize: draft.shoeSize ? Number(draft.shoeSize) : undefined,
        emergencyContactName: draft.emergencyContactName || undefined,
        emergencyContactMobile: draft.emergencyContactMobile || undefined,
        emergencyContactRelationship: draft.emergencyContactRelationship || undefined,
        referralSource: draft.referralSource || undefined,
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
          <h2 className="text-headline-sm text-on-surface">Work Preferences</h2>
          <button type="button" onClick={startEditing} className="text-label-md text-primary font-bold hover:underline">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Preferred Work Location" value={values.preferredWorkLocation} />
          <Field label="Hours Availability" value={values.hoursAvailability} />
          <Field label="Availability to Start" value={values.availabilityToStart} />
          <Field label="Interested Sectors" value={values.interestedSectors.join(", ") || null} />
          <Field label="Transport Mode" value={values.transportMode} />
          <Field label="Shoe Size" value={values.shoeSize !== null ? String(values.shoeSize) : null} />
          <Field label="Emergency Contact Name" value={values.emergencyContactName} />
          <Field label="Emergency Contact Mobile" value={values.emergencyContactMobile} />
          <Field label="Emergency Contact Relationship" value={values.emergencyContactRelationship} />
          <Field label="Referral Source" value={values.referralSource} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <h2 className="text-headline-sm text-on-surface">Work Preferences</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Preferred Work Location</label>
          <input
            className={inputClass}
            value={draft.preferredWorkLocation}
            onChange={(e) => setDraft({ ...draft, preferredWorkLocation: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Hours Availability</label>
          <select
            className={inputClass}
            value={draft.hoursAvailability}
            onChange={(e) => setDraft({ ...draft, hoursAvailability: e.target.value })}
          >
            <option value="">—</option>
            {HOURS_AVAILABILITY.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Availability to Start</label>
          <select
            className={inputClass}
            value={draft.availabilityToStart}
            onChange={(e) => setDraft({ ...draft, availabilityToStart: e.target.value })}
          >
            <option value="">—</option>
            {AVAILABILITY_TO_START.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Transport Mode</label>
          <select
            className={inputClass}
            value={draft.transportMode}
            onChange={(e) => setDraft({ ...draft, transportMode: e.target.value })}
          >
            <option value="">—</option>
            {TRANSPORT_MODES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Shoe Size</label>
          <input
            type="number"
            step="0.5"
            min="3"
            max="16"
            className={inputClass}
            value={draft.shoeSize}
            onChange={(e) => setDraft({ ...draft, shoeSize: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Emergency Contact Name</label>
          <input
            className={inputClass}
            value={draft.emergencyContactName}
            onChange={(e) => setDraft({ ...draft, emergencyContactName: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Emergency Contact Mobile</label>
          <input
            className={inputClass}
            value={draft.emergencyContactMobile}
            onChange={(e) => setDraft({ ...draft, emergencyContactMobile: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Emergency Contact Relationship</label>
          <select
            className={inputClass}
            value={draft.emergencyContactRelationship}
            onChange={(e) => setDraft({ ...draft, emergencyContactRelationship: e.target.value })}
          >
            <option value="">—</option>
            {RELATIONSHIPS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Referral Source</label>
          <select
            className={inputClass}
            value={draft.referralSource}
            onChange={(e) => setDraft({ ...draft, referralSource: e.target.value })}
          >
            <option value="">—</option>
            {REFERRAL_SOURCES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Interested Sectors</label>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              type="button"
              onClick={() => toggleSector(sector)}
              className={
                draft.interestedSectors.includes(sector)
                  ? "h-9 px-3 rounded-full bg-primary text-on-primary text-label-sm font-bold"
                  : "h-9 px-3 rounded-full border border-outline-variant text-on-surface-variant text-label-sm font-bold hover:bg-surface-container-lowest"
              }
            >
              {sector}
            </button>
          ))}
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
