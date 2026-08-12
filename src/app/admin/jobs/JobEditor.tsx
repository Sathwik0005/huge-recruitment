"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createJob, updateJob } from "./actions";

const EMPLOYMENT_TYPES = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "TEMP_TO_PERM", label: "Temp to Perm" },
  { value: "FIXED_TERM", label: "Fixed Term" },
  { value: "CONTRACT", label: "Contract" },
] as const;

const PAY_PERIODS = ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;
const SHIFT_CATEGORIES = ["DAY", "NIGHT", "ROTATING", "WEEKEND", "FLEXIBLE", "OTHER"] as const;

type PayRateDraft = {
  label: string;
  minimum: string;
  maximum: string;
  period: (typeof PAY_PERIODS)[number];
  isPrimary: boolean;
};

type ShiftDraft = {
  category: (typeof SHIFT_CATEGORIES)[number];
  label: string;
  startTime: string;
  endTime: string;
  days: string;
  details: string;
};

type TextEntryDraft = { text: string };

type SectorOption = { id: string; label: string };

export type JobEditorInitialValues = {
  title: string;
  sectorId: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number]["value"];
  overview: string;
  townOrCity: string;
  countyOrRegion: string;
  postcode: string;
  payType: "NUMERIC" | "COMPETITIVE";
  payRates: PayRateDraft[];
  additionalPayInformation: string;
  referenceCode: string;
  shortDescription: string;
  startDate: string;
  closingDate: string;
  vacancyCount: string;
  hoursPerWeek: string;
  additionalInformation: string;
  showPostedDate: boolean;
  featured: boolean;
  shifts: ShiftDraft[];
  responsibilities: TextEntryDraft[];
  requirements: TextEntryDraft[];
  benefits: TextEntryDraft[];
};

const EMPTY_VALUES: JobEditorInitialValues = {
  title: "",
  sectorId: "",
  employmentType: "PERMANENT",
  overview: "",
  townOrCity: "",
  countyOrRegion: "",
  postcode: "",
  payType: "NUMERIC",
  payRates: [],
  additionalPayInformation: "",
  referenceCode: "",
  shortDescription: "",
  startDate: "",
  closingDate: "",
  vacancyCount: "",
  hoursPerWeek: "",
  additionalInformation: "",
  showPostedDate: true,
  featured: false,
  shifts: [],
  responsibilities: [],
  requirements: [],
  benefits: [],
};

const inputClass =
  "w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
const labelClass = "text-label-md text-on-surface-variant block mb-1";
const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

function reorder<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function JobEditor({
  mode,
  jobId,
  sectors,
  initialValues,
}: {
  mode: "create" | "edit";
  jobId?: string;
  sectors: SectorOption[];
  initialValues?: JobEditorInitialValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<JobEditorInitialValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof JobEditorInitialValues>(key: K, value: JobEditorInitialValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    return {
      title: values.title,
      sectorId: values.sectorId,
      employmentType: values.employmentType,
      overview: values.overview,
      townOrCity: values.townOrCity,
      countyOrRegion: values.countyOrRegion || undefined,
      postcode: values.postcode || undefined,
      payType: values.payType,
      payRates:
        values.payType === "NUMERIC"
          ? values.payRates.map((rate, index) => ({
              label: rate.label || undefined,
              minimum: rate.minimum,
              maximum: rate.maximum || undefined,
              period: rate.period,
              isPrimary: rate.isPrimary,
              displayOrder: index,
            }))
          : [],
      additionalPayInformation: values.additionalPayInformation || undefined,
      referenceCode: values.referenceCode || undefined,
      shortDescription: values.shortDescription || undefined,
      startDate: values.startDate || undefined,
      closingDate: values.closingDate || undefined,
      vacancyCount: values.vacancyCount || undefined,
      hoursPerWeek: values.hoursPerWeek || undefined,
      additionalInformation: values.additionalInformation || undefined,
      showPostedDate: values.showPostedDate,
      featured: values.featured,
      shifts: values.shifts.map((shift, index) => ({
        category: shift.category,
        label: shift.label || undefined,
        startTime: shift.startTime || undefined,
        endTime: shift.endTime || undefined,
        days: shift.days || undefined,
        details: shift.details || undefined,
        displayOrder: index,
      })),
      responsibilities: values.responsibilities.map((entry, index) => ({
        text: entry.text,
        displayOrder: index,
      })),
      requirements: values.requirements.map((entry, index) => ({ text: entry.text, displayOrder: index })),
      benefits: values.benefits.map((entry, index) => ({ text: entry.text, displayOrder: index })),
    };
  }

  const requiredFieldsFilled =
    values.title.trim() &&
    values.sectorId &&
    values.overview.trim() &&
    values.townOrCity.trim() &&
    (values.payType === "COMPETITIVE" || values.payRates.length > 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      const payload = buildPayload();

      if (mode === "create") {
        const result = await createJob(payload);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/jobs/${result.data.jobId}/edit`);
        return;
      }

      const result = await updateJob(jobId as string, payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/admin/jobs");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <section className={cardClass}>
        <h2 className="text-headline-md text-primary">Basics</h2>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="title">
            Job title
          </label>
          <input
            id="title"
            className={inputClass}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="sectorId">
              Sector
            </label>
            <select
              id="sectorId"
              className={inputClass}
              value={values.sectorId}
              onChange={(e) => set("sectorId", e.target.value)}
              required
            >
              <option value="">Select a sector</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="employmentType">
              Employment type
            </label>
            <select
              id="employmentType"
              className={inputClass}
              value={values.employmentType}
              onChange={(e) => set("employmentType", e.target.value as JobEditorInitialValues["employmentType"])}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="overview">
            Role overview
          </label>
          <textarea
            id="overview"
            className={`${inputClass} h-32 py-3`}
            value={values.overview}
            onChange={(e) => set("overview", e.target.value)}
            required
          />
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-headline-md text-primary">Location</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="townOrCity">
              Town or city
            </label>
            <input
              id="townOrCity"
              className={inputClass}
              value={values.townOrCity}
              onChange={(e) => set("townOrCity", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="countyOrRegion">
              County / region (optional)
            </label>
            <input
              id="countyOrRegion"
              className={inputClass}
              value={values.countyOrRegion}
              onChange={(e) => set("countyOrRegion", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="postcode">
              Postcode (optional)
            </label>
            <input
              id="postcode"
              className={inputClass}
              value={values.postcode}
              onChange={(e) => set("postcode", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md text-primary">Pay</h2>
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <input
              type="checkbox"
              checked={values.payType === "COMPETITIVE"}
              onChange={(e) => {
                set("payType", e.target.checked ? "COMPETITIVE" : "NUMERIC");
                if (e.target.checked) set("payRates", []);
              }}
            />
            Competitive (no fixed rate)
          </label>
        </div>

        {values.payType === "NUMERIC" && (
          <div className="space-y-4">
            {values.payRates.map((rate, index) => (
              <div key={index} className="rounded-lg border border-outline-variant p-4 space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className={labelClass} htmlFor={`payRate-${index}-label`}>
                      Label (optional)
                    </label>
                    <input
                      id={`payRate-${index}-label`}
                      className={inputClass}
                      value={rate.label}
                      onChange={(e) => {
                        const next = [...values.payRates];
                        next[index] = { ...rate, label: e.target.value };
                        set("payRates", next);
                      }}
                      placeholder="e.g. Day shift"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass} htmlFor={`payRate-${index}-minimum`}>
                      Minimum pay
                    </label>
                    <input
                      id={`payRate-${index}-minimum`}
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClass}
                      value={rate.minimum}
                      onChange={(e) => {
                        const next = [...values.payRates];
                        next[index] = { ...rate, minimum: e.target.value };
                        set("payRates", next);
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass} htmlFor={`payRate-${index}-maximum`}>
                      Maximum pay (optional)
                    </label>
                    <input
                      id={`payRate-${index}-maximum`}
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClass}
                      value={rate.maximum}
                      onChange={(e) => {
                        const next = [...values.payRates];
                        next[index] = { ...rate, maximum: e.target.value };
                        set("payRates", next);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass} htmlFor={`payRate-${index}-period`}>
                      Period
                    </label>
                    <select
                      id={`payRate-${index}-period`}
                      className={inputClass}
                      value={rate.period}
                      onChange={(e) => {
                        const next = [...values.payRates];
                        next[index] = { ...rate, period: e.target.value as PayRateDraft["period"] };
                        set("payRates", next);
                      }}
                    >
                      {PAY_PERIODS.map((period) => (
                        <option key={period} value={period}>
                          Per {period.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
                    <input
                      type="radio"
                      name="primaryPayRate"
                      checked={rate.isPrimary}
                      onChange={() =>
                        set(
                          "payRates",
                          values.payRates.map((r, i) => ({ ...r, isPrimary: i === index }))
                        )
                      }
                    />
                    Primary rate (shown on cards)
                  </label>
                  <button
                    type="button"
                    className="text-label-md text-error font-bold hover:underline"
                    onClick={() => set("payRates", values.payRates.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-label-md text-primary font-bold hover:underline"
              onClick={() =>
                set("payRates", [
                  ...values.payRates,
                  {
                    label: "",
                    minimum: "",
                    maximum: "",
                    period: "HOUR",
                    isPrimary: values.payRates.length === 0,
                  },
                ])
              }
            >
              + Add pay rate
            </button>
          </div>
        )}

        <div className="space-y-1">
          <label className={labelClass} htmlFor="additionalPayInformation">
            Additional pay information (optional)
          </label>
          <textarea
            id="additionalPayInformation"
            className={`${inputClass} h-20 py-3`}
            value={values.additionalPayInformation}
            onChange={(e) => set("additionalPayInformation", e.target.value)}
          />
        </div>
      </section>

      <RepeatableTextSection
        title="Responsibilities"
        entries={values.responsibilities}
        onChange={(entries) => set("responsibilities", entries)}
      />
      <RepeatableTextSection
        title="Candidate requirements"
        entries={values.requirements}
        onChange={(entries) => set("requirements", entries)}
      />
      <RepeatableTextSection title="Benefits" entries={values.benefits} onChange={(entries) => set("benefits", entries)} />

      <section className={cardClass}>
        <h2 className="text-headline-md text-primary">Shifts (optional)</h2>
        {values.shifts.map((shift, index) => (
          <div key={index} className="rounded-lg border border-outline-variant p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`shift-${index}-category`}>
                  Category
                </label>
                <select
                  id={`shift-${index}-category`}
                  className={inputClass}
                  value={shift.category}
                  onChange={(e) => {
                    const next = [...values.shifts];
                    next[index] = { ...shift, category: e.target.value as ShiftDraft["category"] };
                    set("shifts", next);
                  }}
                >
                  {SHIFT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`shift-${index}-label`}>
                  Label (optional)
                </label>
                <input
                  id={`shift-${index}-label`}
                  className={inputClass}
                  value={shift.label}
                  onChange={(e) => {
                    const next = [...values.shifts];
                    next[index] = { ...shift, label: e.target.value };
                    set("shifts", next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`shift-${index}-days`}>
                  Days (optional)
                </label>
                <input
                  id={`shift-${index}-days`}
                  className={inputClass}
                  value={shift.days}
                  onChange={(e) => {
                    const next = [...values.shifts];
                    next[index] = { ...shift, days: e.target.value };
                    set("shifts", next);
                  }}
                  placeholder="e.g. Monday to Friday"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`shift-${index}-startTime`}>
                  Start time (optional)
                </label>
                <input
                  id={`shift-${index}-startTime`}
                  type="time"
                  className={inputClass}
                  value={shift.startTime}
                  onChange={(e) => {
                    const next = [...values.shifts];
                    next[index] = { ...shift, startTime: e.target.value };
                    set("shifts", next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`shift-${index}-endTime`}>
                  End time (optional)
                </label>
                <input
                  id={`shift-${index}-endTime`}
                  type="time"
                  className={inputClass}
                  value={shift.endTime}
                  onChange={(e) => {
                    const next = [...values.shifts];
                    next[index] = { ...shift, endTime: e.target.value };
                    set("shifts", next);
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              className="text-label-md text-error font-bold hover:underline"
              onClick={() => set("shifts", values.shifts.filter((_, i) => i !== index))}
            >
              Remove shift
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-label-md text-primary font-bold hover:underline"
          onClick={() =>
            set("shifts", [
              ...values.shifts,
              { category: "DAY", label: "", startTime: "", endTime: "", days: "", details: "" },
            ])
          }
        >
          + Add shift
        </button>
      </section>

      <section className={cardClass}>
        <h2 className="text-headline-md text-primary">Other details (optional)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="referenceCode">
              Reference code
            </label>
            <input
              id="referenceCode"
              className={inputClass}
              value={values.referenceCode}
              onChange={(e) => set("referenceCode", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="vacancyCount">
              Vacancy count
            </label>
            <input
              id="vacancyCount"
              type="number"
              min="1"
              className={inputClass}
              value={values.vacancyCount}
              onChange={(e) => set("vacancyCount", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="hoursPerWeek">
              Hours per week
            </label>
            <input
              id="hoursPerWeek"
              type="number"
              min="1"
              step="0.5"
              className={inputClass}
              value={values.hoursPerWeek}
              onChange={(e) => set("hoursPerWeek", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="startDate">
              Start date
            </label>
            <input
              id="startDate"
              type="date"
              className={inputClass}
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="closingDate">
              Closing date
            </label>
            <input
              id="closingDate"
              type="date"
              className={inputClass}
              value={values.closingDate}
              onChange={(e) => set("closingDate", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="shortDescription">
            Short description (card excerpt, optional)
          </label>
          <input
            id="shortDescription"
            className={inputClass}
            value={values.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
            maxLength={300}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="additionalInformation">
            Additional information
          </label>
          <textarea
            id="additionalInformation"
            className={`${inputClass} h-20 py-3`}
            value={values.additionalInformation}
            onChange={(e) => set("additionalInformation", e.target.value)}
          />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <input
              type="checkbox"
              checked={values.showPostedDate}
              onChange={(e) => set("showPostedDate", e.target.checked)}
            />
            Show posted date publicly
          </label>
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <input type="checkbox" checked={values.featured} onChange={(e) => set("featured", e.target.checked)} />
            Featured
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !requiredFieldsFilled}
          className="h-12 px-8 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
        >
          {submitting ? "Saving..." : mode === "create" ? "Create draft" : "Save changes"}
        </button>
        {!requiredFieldsFilled && (
          <p className="text-label-sm text-on-surface-variant">
            Title, sector, overview, town/city, and valid pay are required.
          </p>
        )}
      </div>
    </form>
  );
}

function RepeatableTextSection({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: TextEntryDraft[];
  onChange: (entries: TextEntryDraft[]) => void;
}) {
  return (
    <section className={cardClass}>
      <h2 className="text-headline-md text-primary">{title} (optional)</h2>
      {entries.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            aria-label={`${title} entry ${index + 1}`}
            className={inputClass}
            value={entry.text}
            onChange={(e) => {
              const next = [...entries];
              next[index] = { text: e.target.value };
              onChange(next);
            }}
          />
          <button
            type="button"
            aria-label={`Move ${title.toLowerCase()} entry up`}
            className="text-on-surface-variant hover:text-primary disabled:opacity-30"
            disabled={index === 0}
            onClick={() => onChange(reorder(entries, index, index - 1))}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move ${title.toLowerCase()} entry down`}
            className="text-on-surface-variant hover:text-primary disabled:opacity-30"
            disabled={index === entries.length - 1}
            onClick={() => onChange(reorder(entries, index, index + 1))}
          >
            ↓
          </button>
          <button
            type="button"
            className="text-label-md text-error font-bold hover:underline"
            onClick={() => onChange(entries.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-label-md text-primary font-bold hover:underline"
        onClick={() => onChange([...entries, { text: "" }])}
      >
        + Add
      </button>
    </section>
  );
}
