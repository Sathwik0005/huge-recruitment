"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { candidateProfileStep2ContinueSchema } from "@/lib/validation/candidate-profile-step2";

const inputClass =
  "w-full h-10 px-3 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all";
// Used inside the tinted "Add/Edit Employment Reference" panel — an explicit
// white background keeps each input visually distinct from the panel's own
// tint, otherwise the inputs blend into the panel and it's unclear where to
// click.
const refInputClass =
  "w-full h-10 px-3 bg-white border border-surface-container-high text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:border-candidate-navy-dark focus:shadow-md transition-all";
const labelClass = "block text-label-md text-candidate-text-heading mb-1";
const cardClass =
  "bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-md space-y-5";
const errorTextClass = "text-label-sm text-error mt-1";

const HOURS_OPTIONS = [
  { value: "ZERO_TO_TEN", label: "0 - 10 hrs" },
  { value: "TEN_TO_TWENTY", label: "10 - 20 hrs" },
  { value: "TWENTY_TO_THIRTY", label: "20 - 30 hrs" },
  { value: "THIRTY_PLUS", label: "30+ hrs (Full Time)" },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "NEXT_WEEK", label: "Next week" },
  { value: "TWO_TO_THREE_WEEKS", label: "2 - 3 weeks" },
  { value: "FOUR_WEEKS_PLUS", label: "4+ weeks time" },
] as const;

// Reuses the jobs platform's existing five sectors (see `Sector`/`SectorName`
// in prisma/schema.prisma) rather than a parallel taxonomy for the same roles.
const SECTOR_OPTIONS = [
  { value: "WAREHOUSING", label: "Warehouse" },
  { value: "MANUFACTURING", label: "Manufacture" },
  { value: "DISTRIBUTION", label: "Distribution" },
  { value: "AUTOMOTIVE", label: "Automotive" },
  { value: "PRODUCTION", label: "Production" },
] as const;

const TRANSPORT_OPTIONS = [
  { value: "CAR", label: "Car" },
  { value: "BUS", label: "Bus" },
  { value: "TAXI", label: "Taxi" },
  { value: "CYCLE", label: "Cycle" },
  { value: "WALK", label: "Walk" },
  { value: "TRAIN", label: "Train" },
] as const;

const RELATIONSHIP_OPTIONS = [
  { value: "SPOUSE_PARTNER", label: "Spouse / Partner" },
  { value: "RELATIVE_FAMILY", label: "Relative / Family" },
  { value: "FRIEND", label: "Friend" },
  { value: "OTHER", label: "Other" },
] as const;

const REFERRAL_OPTIONS = [
  { value: "INDEED_JOB_BOARD", label: "Indeed / Job Board" },
  { value: "GOOGLE_SEARCH", label: "Google Search" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "FRIEND_COLLEAGUE_REFERRAL", label: "Friend / Colleague Referral" },
  { value: "JOBCENTRE_PLUS", label: "Jobcentre Plus" },
  { value: "OTHER", label: "Other" },
] as const;

const MIN_SHOE_SIZE = 3;
const MAX_SHOE_SIZE = 16;

export interface Step2InitialValues {
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
}

export interface WorkReferenceValue {
  jobTitle: string;
  companyName: string;
  companyAddress: string;
  startDate: string;
  endDate: string;
  isCurrentJob: boolean;
  managerName: string;
  managerMobile: string;
  managerEmail: string;
}

type FormValues = {
  preferredWorkLocation: string;
  hoursAvailability: string;
  availabilityToStart: string;
  interestedSectors: string[];
  transportMode: string;
  shoeSize: number;
  emergencyContactName: string;
  emergencyContactMobile: string;
  emergencyContactRelationship: string;
  referralSource: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>> & {
  form?: string;
  workReferences?: string;
};

const emptyReference: WorkReferenceValue = {
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

function toFormValues(initial: Step2InitialValues | null): FormValues {
  return {
    preferredWorkLocation: initial?.preferredWorkLocation ?? "",
    hoursAvailability: initial?.hoursAvailability ?? "",
    availabilityToStart: initial?.availabilityToStart ?? "",
    interestedSectors: initial?.interestedSectors ?? [],
    transportMode: initial?.transportMode ?? "",
    shoeSize: initial?.shoeSize ?? 7,
    emergencyContactName: initial?.emergencyContactName ?? "",
    emergencyContactMobile: initial?.emergencyContactMobile ?? "",
    emergencyContactRelationship: initial?.emergencyContactRelationship ?? "",
    referralSource: initial?.referralSource ?? "",
  };
}

function referenceIsValid(reference: WorkReferenceValue): boolean {
  if (
    !reference.jobTitle.trim() ||
    !reference.companyName.trim() ||
    !reference.startDate
  )
    return false;
  if (!reference.isCurrentJob && !reference.endDate) return false;
  return true;
}

function formatReferenceRange(reference: WorkReferenceValue): string {
  const start = reference.startDate || "?";
  const end = reference.isCurrentJob ? "Present" : reference.endDate || "?";
  return `${start} - ${end}`;
}

async function saveProfile(
  intent: "draft" | "continue",
  values: FormValues,
  workReferences: WorkReferenceValue[],
) {
  const response = await fetch("/api/candidate/profile/step-2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, ...values, workReferences }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export function Step2Form({
  initialValues,
  initialWorkReferences,
}: {
  initialValues: Step2InitialValues | null;
  initialWorkReferences: WorkReferenceValue[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(toFormValues(initialValues));
  const [references, setReferences] = useState<WorkReferenceValue[]>(
    initialWorkReferences,
  );
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [draftReference, setDraftReference] =
    useState<WorkReferenceValue>(emptyReference);
  const [referenceError, setReferenceError] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [continuing, setContinuing] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterestedSector(value: string) {
    setValues((prev) => ({
      ...prev,
      interestedSectors: prev.interestedSectors.includes(value)
        ? prev.interestedSectors.filter((sector) => sector !== value)
        : [...prev.interestedSectors, value],
    }));
  }

  function adjustShoeSize(delta: number) {
    setValues((prev) => ({
      ...prev,
      shoeSize: Math.max(
        MIN_SHOE_SIZE,
        Math.min(MAX_SHOE_SIZE, Math.round((prev.shoeSize + delta) * 2) / 2),
      ),
    }));
  }

  function openNewReference() {
    setDraftReference(emptyReference);
    setReferenceError(undefined);
    setEditingIndex("new");
  }

  function openEditReference(index: number) {
    setDraftReference(references[index]);
    setReferenceError(undefined);
    setEditingIndex(index);
  }

  function cancelReferenceEdit() {
    setEditingIndex(null);
    setReferenceError(undefined);
  }

  function deleteReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleCurrentJob(checked: boolean) {
    setDraftReference((prev) => ({
      ...prev,
      isCurrentJob: checked,
      endDate: checked ? "" : prev.endDate,
    }));
  }

  function saveReference() {
    if (!referenceIsValid(draftReference)) {
      setReferenceError(
        "Please fill in job title, company name, start date, and end date (unless this is your current role).",
      );
      return;
    }
    setReferences((prev) => {
      if (editingIndex === "new" || editingIndex === null)
        return [...prev, draftReference];
      const next = [...prev];
      next[editingIndex] = draftReference;
      return next;
    });
    setEditingIndex(null);
    setReferenceError(undefined);
  }

  async function handleSaveDraft() {
    setErrors({});
    setSavingDraft(true);
    try {
      const { ok, data } = await saveProfile("draft", values, references);
      if (!ok) {
        setErrors({
          form: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      router.push("/");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleContinue(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    const parsed = candidateProfileStep2ContinueSchema.safeParse({
      intent: "continue",
      ...values,
      workReferences: references,
    });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "workReferences") {
          nextErrors.workReferences = issue.message;
        } else if (
          typeof key === "string" &&
          !nextErrors[key as keyof FormValues]
        ) {
          nextErrors[key as keyof FormValues] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setContinuing(true);
    try {
      const { ok, data } = await saveProfile("continue", values, references);
      if (!ok) {
        setErrors({
          form: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      // TODO: switch to step 3 once that spec exists.
      router.push("/");
    } finally {
      setContinuing(false);
    }
  }

  const busy = savingDraft || continuing;

  return (
    <form className="space-y-6" onSubmit={handleContinue} noValidate>
      {errors.form && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3"
        >
          {errors.form}
        </p>
      )}

      {/* Card: Work Information */}
      <div className={cardClass}>
        <h2 className="text-headline-md text-candidate-text-heading">
          Work Information
        </h2>

        <div>
          <label className={labelClass} htmlFor="work-location">
            Where are you looking to find work?{" "}
            <span className="text-error">*</span>
          </label>
          <input
            id="work-location"
            className={inputClass}
            placeholder="e.g. Sheffield, Leeds, Doncaster"
            value={values.preferredWorkLocation}
            onChange={(e) => set("preferredWorkLocation", e.target.value)}
          />
          <p className="text-label-sm text-candidate-secondary mt-1">
            You can enter more than one location, separated by commas.
          </p>
          {errors.preferredWorkLocation && (
            <p role="alert" aria-live="assertive" className={errorTextClass}>
              {errors.preferredWorkLocation}
            </p>
          )}
        </div>

        <div>
          <span className={labelClass}>
            How many hours do you need? <span className="text-error">*</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HOURS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="py-2.5 px-3 rounded-lg text-label-sm font-medium text-center bg-surface-container-low text-candidate-text-heading cursor-pointer hover:bg-surface-container transition-colors has-[:checked]:bg-candidate-navy-dark has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="hoursAvailability"
                  value={option.value}
                  checked={values.hoursAvailability === option.value}
                  onChange={(e) => set("hoursAvailability", e.target.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.hoursAvailability && (
            <p role="alert" aria-live="assertive" className={errorTextClass}>
              {errors.hoursAvailability}
            </p>
          )}
        </div>

        <div>
          <span className={labelClass}>
            When are you available to start? <span className="text-error">*</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AVAILABILITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="py-2.5 px-3 rounded-lg text-label-sm font-medium text-center bg-surface-container-low text-candidate-text-heading cursor-pointer hover:bg-surface-container transition-colors has-[:checked]:bg-candidate-navy-dark has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="availabilityToStart"
                  value={option.value}
                  checked={values.availabilityToStart === option.value}
                  onChange={(e) => set("availabilityToStart", e.target.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.availabilityToStart && (
            <p role="alert" aria-live="assertive" className={errorTextClass}>
              {errors.availabilityToStart}
            </p>
          )}
        </div>

        <div>
          <span className={labelClass}>
            Which role(s) are you interested in? <span className="text-error">*</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SECTOR_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="py-2.5 px-3 rounded-lg text-label-sm font-medium text-center bg-surface-container-low text-candidate-text-heading cursor-pointer hover:bg-surface-container transition-colors has-[:checked]:bg-candidate-navy-dark has-[:checked]:text-white"
              >
                <input
                  type="checkbox"
                  name="interestedSectors"
                  value={option.value}
                  checked={values.interestedSectors.includes(option.value)}
                  onChange={() => toggleInterestedSector(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.interestedSectors && (
            <p role="alert" aria-live="assertive" className={errorTextClass}>
              {errors.interestedSectors}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="transport-mode">
              How do you intend on travelling to work?{" "}
              <span className="text-error">*</span>
            </label>
            <select
              id="transport-mode"
              className={inputClass}
              value={values.transportMode}
              onChange={(e) => set("transportMode", e.target.value)}
            >
              <option value="">Select mode of travel</option>
              {TRANSPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.transportMode && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.transportMode}
              </p>
            )}
          </div>

          <div>
            <span className={labelClass}>
              What is your shoe size? (UK) <span className="text-error">*</span>
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-surface-container-low rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => adjustShoeSize(-0.5)}
                  className="w-8 h-8 rounded bg-surface-container-lowest text-candidate-text-heading shadow-sm flex items-center justify-center text-label-lg font-bold hover:bg-surface-container transition-colors"
                >
                  −
                </button>
                <div className="w-14 text-center text-label-lg font-semibold text-candidate-text-heading">
                  {values.shoeSize.toFixed(1)}
                </div>
                <button
                  type="button"
                  onClick={() => adjustShoeSize(0.5)}
                  className="w-8 h-8 rounded bg-surface-container-lowest text-candidate-text-heading shadow-sm flex items-center justify-center text-label-lg font-bold hover:bg-surface-container transition-colors"
                >
                  +
                </button>
              </div>
              <span className="text-label-sm text-candidate-secondary">
                Required for PPE &amp; safety boot provision
              </span>
            </div>
            {errors.shoeSize && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.shoeSize}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card: Emergency Contact */}
      <div className={cardClass}>
        <h2 className="text-headline-md text-candidate-text-heading">
          Emergency Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass} htmlFor="emergency-name">
              Full Name <span className="text-error">*</span>
            </label>
            <input
              id="emergency-name"
              className={inputClass}
              placeholder="e.g. Jane Doe"
              value={values.emergencyContactName}
              onChange={(e) => set("emergencyContactName", e.target.value)}
            />
            {errors.emergencyContactName && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.emergencyContactName}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="emergency-mobile">
              Contact Mobile Number <span className="text-error">*</span>
            </label>
            <div className="flex gap-2">
              <div className="h-10 px-3 rounded-lg bg-surface-container-low flex items-center text-body-md text-candidate-text-heading font-medium shrink-0">
                +44
              </div>
              <input
                id="emergency-mobile"
                className={inputClass}
                placeholder="07700 900123"
                value={values.emergencyContactMobile}
                onChange={(e) => set("emergencyContactMobile", e.target.value)}
              />
            </div>
            {errors.emergencyContactMobile && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.emergencyContactMobile}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="emergency-relationship">
              Relationship Type <span className="text-error">*</span>
            </label>
            <select
              id="emergency-relationship"
              className={inputClass}
              value={values.emergencyContactRelationship}
              onChange={(e) =>
                set("emergencyContactRelationship", e.target.value)
              }
            >
              <option value="">Select relationship</option>
              {RELATIONSHIP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.emergencyContactRelationship && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.emergencyContactRelationship}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card: Work History & References */}
      <div className={cardClass}>
        <div>
          <h2 className="text-headline-md text-candidate-text-heading">
            Work History &amp; References
          </h2>
          <p className="text-label-sm text-candidate-secondary mt-0.5">
            Add your previous employment references.
          </p>
        </div>

        {references.map((reference, index) =>
          editingIndex === index ? null : (
            <div
              key={`${reference.jobTitle}-${index}`}
              className="bg-surface-container-low rounded-lg p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-label-md font-bold text-candidate-text-heading">
                    {reference.jobTitle}
                  </span>
                  {reference.isCurrentJob && (
                    <span className="text-label-sm bg-surface-container-high text-candidate-text-heading px-2 py-0.5 rounded font-medium">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-label-sm text-candidate-secondary font-medium mt-0.5">
                  {reference.companyName}
                </p>
                <p className="text-label-sm text-candidate-secondary mt-1">
                  {formatReferenceRange(reference)}
                </p>
                {reference.managerName && (
                  <p className="text-label-sm text-candidate-secondary mt-1">
                    {reference.managerName}
                    {reference.managerMobile
                      ? ` (Contact: ${reference.managerMobile})`
                      : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label="Edit reference"
                  onClick={() => openEditReference(index)}
                  className="p-1.5 text-candidate-secondary hover:text-candidate-navy-dark hover:bg-surface-container rounded transition-colors"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    aria-hidden="true"
                  >
                    edit
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete reference"
                  onClick={() => deleteReference(index)}
                  className="p-1.5 text-candidate-secondary hover:text-error hover:bg-error-container rounded transition-colors"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    aria-hidden="true"
                  >
                    delete
                  </span>
                </button>
              </div>
            </div>
          ),
        )}

        {editingIndex !== null && (
          <div className="border border-candidate-secondary/30 bg-surface-container rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <span className="text-label-sm font-bold uppercase tracking-wide text-candidate-navy-dark">
                {editingIndex === "new"
                  ? "Add Employment Reference"
                  : "Edit Employment Reference"}
              </span>
            </div>

            {referenceError && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {referenceError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="ref-job-title">
                  Job Title <span className="text-error">*</span>
                </label>
                <input
                  id="ref-job-title"
                  className={refInputClass}
                  placeholder="e.g. Forklift Operator"
                  value={draftReference.jobTitle}
                  onChange={(e) =>
                    setDraftReference((prev) => ({
                      ...prev,
                      jobTitle: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="ref-company-name">
                  Company Name <span className="text-error">*</span>
                </label>
                <input
                  id="ref-company-name"
                  className={refInputClass}
                  placeholder="e.g. Amazon Fulfillment"
                  value={draftReference.companyName}
                  onChange={(e) =>
                    setDraftReference((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="ref-company-address">
                Company Address
              </label>
              <input
                id="ref-company-address"
                className={refInputClass}
                placeholder="e.g. Unit 4, Grange Park, Northampton"
                value={draftReference.companyAddress}
                onChange={(e) =>
                  setDraftReference((prev) => ({
                    ...prev,
                    companyAddress: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="ref-start-date">
                  Start Date <span className="text-error">*</span>
                </label>
                <input
                  id="ref-start-date"
                  type="month"
                  className={refInputClass}
                  value={draftReference.startDate}
                  onChange={(e) =>
                    setDraftReference((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="ref-end-date">
                  End Date
                </label>
                <input
                  id="ref-end-date"
                  type="month"
                  disabled={draftReference.isCurrentJob}
                  className={`${refInputClass} ${draftReference.isCurrentJob ? "opacity-50 cursor-not-allowed" : ""}`}
                  value={draftReference.endDate}
                  onChange={(e) =>
                    setDraftReference((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
                <div className="mt-2 flex items-center">
                  <input
                    id="ref-current-job"
                    type="checkbox"
                    className="h-4 w-4 rounded border-candidate-secondary text-candidate-navy-dark focus:ring-candidate-navy-dark"
                    checked={draftReference.isCurrentJob}
                    onChange={(e) => toggleCurrentJob(e.target.checked)}
                  />
                  <label
                    className="ml-2 text-label-sm text-candidate-secondary select-none"
                    htmlFor="ref-current-job"
                  >
                    Currently working in this role
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass} htmlFor="ref-manager-name">
                  Manager&apos;s Name
                </label>
                <input
                  id="ref-manager-name"
                  className={refInputClass}
                  placeholder="e.g. Sarah Jenkins"
                  value={draftReference.managerName}
                  onChange={(e) =>
                    setDraftReference((prev) => ({
                      ...prev,
                      managerName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="ref-manager-mobile">
                  Manager&apos;s Mobile
                </label>
                <input
                  id="ref-manager-mobile"
                  className={refInputClass}
                  placeholder="07123 456789"
                  value={draftReference.managerMobile}
                  onChange={(e) =>
                    setDraftReference((prev) => ({
                      ...prev,
                      managerMobile: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="ref-manager-email">
                  Manager&apos;s Email
                </label>
                <input
                  id="ref-manager-email"
                  type="email"
                  className={refInputClass}
                  placeholder="sarah.j@amazon.com"
                  value={draftReference.managerEmail}
                  onChange={(e) =>
                    setDraftReference((prev) => ({
                      ...prev,
                      managerEmail: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={cancelReferenceEdit}
                className="px-4 py-2 text-label-md text-candidate-secondary hover:text-candidate-text-heading hover:bg-surface-container rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReference}
                className="px-5 py-2 text-label-md font-semibold text-white bg-candidate-navy-dark hover:bg-candidate-secondary rounded-lg transition-colors shadow-sm"
              >
                Save Reference
              </button>
            </div>
          </div>
        )}

        {editingIndex === null && (
          <button
            type="button"
            onClick={openNewReference}
            className="w-full border-2 border-dashed border-surface-container-high hover:border-candidate-secondary hover:bg-surface-container-low rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-label-md font-semibold text-candidate-navy-dark transition-all"
          >
            <span
              className="material-symbols-outlined text-[18px]"
              aria-hidden="true"
            >
              add
            </span>
            <span>Add Another Reference</span>
          </button>
        )}

        {errors.workReferences && (
          <p role="alert" aria-live="assertive" className={errorTextClass}>
            {errors.workReferences}
          </p>
        )}
      </div>

      {/* Card: Additional Information */}
      <div className={cardClass}>
        <h2 className="text-headline-md text-candidate-text-heading">
          Additional Information
        </h2>
        <div>
          <label className={labelClass} htmlFor="referral-source">
            How did you hear about us? <span className="text-error">*</span>
          </label>
          <select
            id="referral-source"
            className={inputClass}
            value={values.referralSource}
            onChange={(e) => set("referralSource", e.target.value)}
          >
            <option value="">Select an option</option>
            {REFERRAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.referralSource && (
            <p role="alert" aria-live="assertive" className={errorTextClass}>
              {errors.referralSource}
            </p>
          )}
        </div>
      </div>

      {/* Form actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={busy}
          className="w-full sm:w-auto h-10 px-5 rounded-lg bg-surface-container-lowest text-candidate-text-heading text-label-md font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            bookmark_border
          </span>
          {savingDraft ? "Saving..." : "Save Draft & Exit"}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto h-11 px-7 rounded-lg bg-candidate-navy-dark hover:bg-candidate-secondary text-white text-label-md font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {continuing ? "Saving..." : "Save & Continue to Step 3"}
          <span
            className="material-symbols-outlined text-[20px]"
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </button>
      </div>
    </form>
  );
}
