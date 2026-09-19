"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { candidateProfileContinueSchema } from "@/lib/validation/candidate-profile";

const inputClass =
  "w-full h-10 px-3 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all";
const labelClass = "block text-label-md text-candidate-text-heading mb-1";
const cardClass = "bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-md space-y-5";
const errorTextClass = "text-label-sm text-error mt-1";

const TITLE_OPTIONS = [
  { value: "MR", label: "Mr" },
  { value: "MRS", label: "Mrs" },
  { value: "MISS", label: "Miss" },
  { value: "MS", label: "Ms" },
  { value: "DR", label: "Dr" },
  { value: "OTHER", label: "Other" },
] as const;

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Prefer Not" },
] as const;

const NATIONALITY_OPTIONS = [
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Irish" },
  { value: "PL", label: "Polish" },
  { value: "RO", label: "Romanian" },
  { value: "DE", label: "German" },
  { value: "FR", label: "French" },
  { value: "OTHER", label: "Other / Non-EU/UK" },
] as const;

const DIAL_CODE_OPTIONS = [
  { value: "+44", label: "+44" },
  { value: "+353", label: "+353" },
  { value: "+48", label: "+48" },
  { value: "+40", label: "+40" },
] as const;

export interface Step1InitialValues {
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  surname: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  niNumber: string | null;
  isStudying: boolean | null;
  hasUnspentConvictions: boolean | null;
  mobileDialCode: string | null;
  mobileNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  townOrCity: string | null;
  countyOrRegion: string | null;
  postcode: string | null;
}

type FormValues = {
  title: string;
  firstName: string;
  middleName: string;
  surname: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  niNumber: string;
  isStudying: boolean | null;
  hasUnspentConvictions: boolean | null;
  mobileDialCode: string;
  mobileNumber: string;
  addressLine1: string;
  addressLine2: string;
  townOrCity: string;
  countyOrRegion: string;
  postcode: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>> & { form?: string };

function toFormValues(initial: Step1InitialValues | null): FormValues {
  return {
    title: initial?.title ?? "MR",
    firstName: initial?.firstName ?? "",
    middleName: initial?.middleName ?? "",
    surname: initial?.surname ?? "",
    gender: initial?.gender ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "",
    nationality: initial?.nationality ?? "",
    niNumber: initial?.niNumber ?? "",
    isStudying: initial?.isStudying ?? null,
    hasUnspentConvictions: initial?.hasUnspentConvictions ?? null,
    mobileDialCode: initial?.mobileDialCode ?? "+44",
    mobileNumber: initial?.mobileNumber ?? "",
    addressLine1: initial?.addressLine1 ?? "",
    addressLine2: initial?.addressLine2 ?? "",
    townOrCity: initial?.townOrCity ?? "",
    countyOrRegion: initial?.countyOrRegion ?? "",
    postcode: initial?.postcode ?? "",
  };
}

async function saveProfile(intent: "draft" | "continue", values: FormValues) {
  const response = await fetch("/api/candidate/profile/step-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, ...values }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

interface Step1FormProps {
  initialValues: Step1InitialValues | null;
  onContinue: () => void;
  readOnly?: boolean;
  onLockedInteraction?: () => void;
}

export function Step1Form({ initialValues, onContinue, readOnly = false, onLockedInteraction }: Step1FormProps) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(toFormValues(initialValues));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [postcodeQuery, setPostcodeQuery] = useState("");
  const [lookingUpPostcode, setLookingUpPostcode] = useState(false);
  const [postcodeError, setPostcodeError] = useState<string>();

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePostcodeLookup() {
    const postcode = postcodeQuery.trim();
    if (!postcode) return;

    setPostcodeError(undefined);
    setLookingUpPostcode(true);
    try {
      const response = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(postcode)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPostcodeError(data.error ?? "Postcode lookup failed. Please try again.");
        return;
      }
      setValues((prev) => ({
        ...prev,
        townOrCity: data.townOrCity || prev.townOrCity,
        countyOrRegion: data.countyOrRegion || prev.countyOrRegion,
        postcode: data.postcode || prev.postcode,
      }));
      setPostcodeQuery("");
    } finally {
      setLookingUpPostcode(false);
    }
  }

  async function handleSaveDraft() {
    setErrors({});
    setSavingDraft(true);
    try {
      const { ok, data } = await saveProfile("draft", values);
      if (!ok) {
        setErrors({ form: data.error ?? "Something went wrong. Please try again." });
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

    const parsed = candidateProfileContinueSchema.safeParse({ intent: "continue", ...values });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues | undefined;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setContinuing(true);
    try {
      const { ok, data } = await saveProfile("continue", values);
      if (!ok) {
        setErrors({ form: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      onContinue();
    } finally {
      setContinuing(false);
    }
  }

  const busy = savingDraft || continuing;

  return (
    <form className="space-y-6" onSubmit={handleContinue} noValidate>
      {errors.form && (
        <p role="alert" aria-live="assertive" className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
          {errors.form}
        </p>
      )}

      <div className="relative">
      {readOnly && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed"
          onClick={onLockedInteraction}
          role="presentation"
        />
      )}
      <fieldset disabled={readOnly} className="contents space-y-6">
      {/* Section A: Personal Details */}
      <div className={cardClass}>
        <h2 className="text-headline-md text-candidate-text-heading">Personal Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor="title-select">
              Title <span className="text-error">*</span>
            </label>
            <select id="title-select" className={inputClass} value={values.title} onChange={(e) => set("title", e.target.value)}>
              {TITLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-5">
            <label className={labelClass} htmlFor="first-name">
              First Name <span className="text-error">*</span>
            </label>
            <input
              id="first-name"
              className={inputClass}
              value={values.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
            {errors.firstName && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.firstName}
              </p>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className={labelClass} htmlFor="middle-name">
              Middle Name
            </label>
            <input
              id="middle-name"
              className={inputClass}
              value={values.middleName}
              onChange={(e) => set("middleName", e.target.value)}
            />
          </div>

          <div className="sm:col-span-6">
            <label className={labelClass} htmlFor="surname">
              Surname / Last Name <span className="text-error">*</span>
            </label>
            <input
              id="surname"
              className={inputClass}
              value={values.surname}
              onChange={(e) => set("surname", e.target.value)}
            />
            {errors.surname && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.surname}
              </p>
            )}
          </div>

          <div className="sm:col-span-6">
            <span className={labelClass}>
              Gender <span className="text-error">*</span>
            </span>
            <div className="grid grid-cols-3 gap-2 h-10">
              {GENDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-center gap-1.5 px-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors has-[:checked]:bg-candidate-navy-dark has-[:checked]:text-white"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={values.gender === option.value}
                    onChange={(e) => set("gender", e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-label-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.gender && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.gender}
              </p>
            )}
          </div>

          <div className="sm:col-span-6">
            <label className={labelClass} htmlFor="dob-input">
              Date of Birth <span className="text-error">*</span>
            </label>
            <input
              id="dob-input"
              type="date"
              className={inputClass}
              value={values.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
            {errors.dateOfBirth && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          <div className="sm:col-span-6">
            <label className={labelClass} htmlFor="nationality-select">
              Nationality <span className="text-error">*</span>
            </label>
            <select
              id="nationality-select"
              className={inputClass}
              value={values.nationality}
              onChange={(e) => set("nationality", e.target.value)}
            >
              <option value="">Select nationality</option>
              {NATIONALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.nationality && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.nationality}
              </p>
            )}
          </div>

          <div className="sm:col-span-6">
            <label className={labelClass} htmlFor="ni-number">
              NI Number <span className="text-error">*</span>
            </label>
            <input
              id="ni-number"
              className={`${inputClass} uppercase tracking-widest font-mono`}
              placeholder="e.g. QQ 12 34 56 A"
              maxLength={13}
              value={values.niNumber}
              onChange={(e) => set("niNumber", e.target.value)}
            />
            {errors.niNumber && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.niNumber}
              </p>
            )}
          </div>

          <div className="sm:col-span-6">
            <label className={labelClass} htmlFor="mobile-input">
              Mobile Phone Number <span className="text-error">*</span>
            </label>
            <div className="flex gap-2">
              <select
                className="w-24 shrink-0 h-10 px-2 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all"
                value={values.mobileDialCode}
                onChange={(e) => set("mobileDialCode", e.target.value)}
              >
                {DIAL_CODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                id="mobile-input"
                className="flex-1 min-w-0 h-10 px-3 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all"
                value={values.mobileNumber}
                onChange={(e) => set("mobileNumber", e.target.value)}
              />
            </div>
            {errors.mobileNumber && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.mobileNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section B: Eligibility & Declarations */}
      <div className={cardClass}>
        <h2 className="text-headline-md text-candidate-text-heading">Eligibility &amp; Declarations</h2>

        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-label-md text-candidate-text-heading">
            Are you currently studying full-time or part-time? <span className="text-error">*</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((option) => (
              <label
                key={String(option.value)}
                className="px-5 py-2 rounded-lg bg-surface-container-lowest cursor-pointer text-candidate-text-heading text-label-md has-[:checked]:bg-candidate-secondary has-[:checked]:text-white transition-colors"
              >
                <input
                  type="radio"
                  name="isStudying"
                  className="sr-only"
                  checked={values.isStudying === option.value}
                  onChange={() => set("isStudying", option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        {errors.isStudying && (
          <p role="alert" aria-live="assertive" className={errorTextClass}>
            {errors.isStudying}
          </p>
        )}

        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-label-md text-candidate-text-heading">
            Do you have any unspent criminal convictions? <span className="text-error">*</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((option) => (
              <label
                key={String(option.value)}
                className="px-5 py-2 rounded-lg bg-surface-container-lowest cursor-pointer text-candidate-text-heading text-label-md has-[:checked]:bg-candidate-secondary has-[:checked]:text-white transition-colors"
              >
                <input
                  type="radio"
                  name="hasUnspentConvictions"
                  className="sr-only"
                  checked={values.hasUnspentConvictions === option.value}
                  onChange={() => set("hasUnspentConvictions", option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        {errors.hasUnspentConvictions && (
          <p role="alert" aria-live="assertive" className={errorTextClass}>
            {errors.hasUnspentConvictions}
          </p>
        )}
      </div>

      {/* Section C: Residential Address */}
      <div className={cardClass}>
        <h2 className="text-headline-md text-candidate-text-heading">Residential Address</h2>

        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            className={`${inputClass} flex-1 uppercase`}
            placeholder="Enter UK Postcode (e.g. S1 2BJ)"
            value={postcodeQuery}
            onChange={(e) => setPostcodeQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={handlePostcodeLookup}
            disabled={lookingUpPostcode || !postcodeQuery.trim()}
            className="h-10 px-4 rounded-lg bg-candidate-navy-dark text-white text-label-md font-bold hover:bg-candidate-secondary transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              search
            </span>
            {lookingUpPostcode ? "Searching..." : "Find Address"}
          </button>
        </div>
        {postcodeError && (
          <p role="alert" aria-live="assertive" className={errorTextClass}>
            {postcodeError}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-12">
            <label className={labelClass} htmlFor="address-line1">
              Address Line 1 <span className="text-error">*</span>
            </label>
            <input
              id="address-line1"
              className={inputClass}
              placeholder="Building number and street name"
              value={values.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
            />
            {errors.addressLine1 && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.addressLine1}
              </p>
            )}
          </div>

          <div className="sm:col-span-12">
            <label className={labelClass} htmlFor="address-line2">
              Address Line 2
            </label>
            <input
              id="address-line2"
              className={inputClass}
              placeholder="Flat"
              value={values.addressLine2}
              onChange={(e) => set("addressLine2", e.target.value)}
            />
          </div>

          <div className="sm:col-span-5">
            <label className={labelClass} htmlFor="town-city">
              Town / City <span className="text-error">*</span>
            </label>
            <input
              id="town-city"
              className={inputClass}
              placeholder="e.g. Sheffield"
              value={values.townOrCity}
              onChange={(e) => set("townOrCity", e.target.value)}
            />
            {errors.townOrCity && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.townOrCity}
              </p>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className={labelClass} htmlFor="county">
              County
            </label>
            <input
              id="county"
              className={inputClass}
              placeholder="e.g. South Yorkshire"
              value={values.countyOrRegion}
              onChange={(e) => set("countyOrRegion", e.target.value)}
            />
          </div>

          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor="postcode">
              Postcode <span className="text-error">*</span>
            </label>
            <input
              id="postcode"
              className={`${inputClass} uppercase font-semibold`}
              placeholder="e.g. S1 2BJ"
              value={values.postcode}
              onChange={(e) => set("postcode", e.target.value)}
            />
            {errors.postcode && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.postcode}
              </p>
            )}
          </div>
        </div>
      </div>
      </fieldset>
      </div>

      {/* Form actions */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={busy}
            className="w-full sm:w-auto h-10 px-5 rounded-lg bg-surface-container-lowest text-candidate-text-heading text-label-md font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              bookmark_border
            </span>
            {savingDraft ? "Saving..." : "Save Draft & Exit"}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="w-full sm:w-auto h-11 px-7 rounded-lg bg-candidate-navy-dark hover:bg-candidate-secondary text-white text-label-md font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {continuing ? "Saving..." : "Save & Continue to Step 2"}
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </div>
      )}
    </form>
  );
}
