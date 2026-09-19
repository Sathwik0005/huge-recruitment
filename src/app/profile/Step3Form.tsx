"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DocumentDropzone } from "./DocumentDropzone";
import { candidateProfileStep3SubmitSchema } from "@/lib/validation/candidate-profile-step3";

const inputClass =
  "w-full h-10 px-3 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all";
const labelClass = "block text-label-md text-candidate-text-heading mb-1";
const cardClass = "bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-md space-y-5";
const errorTextClass = "text-label-sm text-error mt-1";
const subBlockClass = "bg-surface-container-low rounded-xl p-4 sm:p-5 border border-surface-container-high space-y-4";
// Used inside subBlockClass's tinted panel (share code / expiry date fields) —
// an explicit white background keeps each input visually distinct from the
// panel's own tint, matching Step2Form's refInputClass fix for the same issue.
const subInputClass =
  "w-full h-10 px-3 bg-white border border-surface-container-high text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:border-candidate-navy-dark focus:shadow-md transition-all";

const DOC_TYPE_OPTIONS = [
  { value: "PASSPORT", label: "Passport", icon: "menu_book" },
  { value: "ID_CARD", label: "ID Card", icon: "badge" },
  { value: "BRP_EVISA", label: "BRP / E-Visa", icon: "verified_user" },
] as const;

export interface Step3InitialValues {
  rightToWorkDocumentType: string | null;
  brpSubtype: string | null;
  visaExpiryDate: string | null;
  rightToWorkShareCode: string | null;
  rightToWorkShareCodeExpiryDate: string | null;
  rightToWorkDocFrontS3Key: string | null;
  rightToWorkDocFrontOriginalFilename: string | null;
  rightToWorkDocBackS3Key: string | null;
  rightToWorkDocBackOriginalFilename: string | null;
  bankAccountHolderName: string | null;
  bankAccountNumber: string | null;
  bankSortCode: string | null;
  bankStatementS3Key: string | null;
  bankStatementOriginalFilename: string | null;
}

type FormValues = {
  rightToWorkDocumentType: string;
  brpSubtype: string;
  visaExpiryDate: string;
  rightToWorkShareCode: string;
  rightToWorkShareCodeExpiryDate: string;
  rightToWorkDocFrontS3Key: string;
  rightToWorkDocFrontOriginalFilename: string;
  rightToWorkDocBackS3Key: string;
  rightToWorkDocBackOriginalFilename: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  bankSortCode: string;
  bankStatementS3Key: string;
  bankStatementOriginalFilename: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>> & { form?: string };

function toFormValues(initial: Step3InitialValues | null): FormValues {
  return {
    rightToWorkDocumentType: initial?.rightToWorkDocumentType ?? "",
    brpSubtype: initial?.brpSubtype ?? "",
    visaExpiryDate: initial?.visaExpiryDate ?? "",
    rightToWorkShareCode: initial?.rightToWorkShareCode ?? "",
    rightToWorkShareCodeExpiryDate: initial?.rightToWorkShareCodeExpiryDate ?? "",
    rightToWorkDocFrontS3Key: initial?.rightToWorkDocFrontS3Key ?? "",
    rightToWorkDocFrontOriginalFilename: initial?.rightToWorkDocFrontOriginalFilename ?? "",
    rightToWorkDocBackS3Key: initial?.rightToWorkDocBackS3Key ?? "",
    rightToWorkDocBackOriginalFilename: initial?.rightToWorkDocBackOriginalFilename ?? "",
    bankAccountHolderName: initial?.bankAccountHolderName ?? "",
    bankAccountNumber: initial?.bankAccountNumber ?? "",
    bankSortCode: initial?.bankSortCode ?? "",
    bankStatementS3Key: initial?.bankStatementS3Key ?? "",
    bankStatementOriginalFilename: initial?.bankStatementOriginalFilename ?? "",
  };
}

/** Converts every "" field to undefined so an unselected optional field is omitted from the JSON payload, matching the server schema's `.optional()` fields. */
function cleanPayload(values: FormValues): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    result[key] = value === "" ? undefined : value;
  }
  return result;
}

function formatSortCode(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  return digits.match(/.{1,2}/g)?.join("-") ?? digits;
}

async function saveProfile(intent: "draft" | "submit", values: FormValues) {
  const response = await fetch("/api/candidate/profile/step-3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, ...cleanPayload(values) }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

interface Step3FormProps {
  initialValues: Step3InitialValues | null;
  onSubmitted: () => void;
  onAvatarMissing: () => void;
  readOnly?: boolean;
  onLockedInteraction?: () => void;
}

export function Step3Form({
  initialValues,
  onSubmitted,
  onAvatarMissing,
  readOnly = false,
  onLockedInteraction,
}: Step3FormProps) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(toFormValues(initialValues));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    const parsed = candidateProfileStep3SubmitSchema.safeParse({ intent: "submit", ...cleanPayload(values) });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !nextErrors[key as keyof FormValues]) {
          nextErrors[key as keyof FormValues] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { ok, data } = await saveProfile("submit", values);
      if (!ok) {
        if (data.field === "avatar") {
          onAvatarMissing();
        }
        setErrors({ form: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  const busy = savingDraft || submitting;
  const docType = values.rightToWorkDocumentType;

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {errors.form && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3"
        >
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
      {/* Card: Proof of Right to Work */}
      <div className={cardClass}>
        <div>
          <h2 className="text-headline-md text-candidate-text-heading">Proof of Right to Work</h2>
          <p className="text-label-sm text-candidate-secondary mt-0.5">
            Under UK legislation, we must verify your legal right to work before placing you into industrial work.
          </p>
        </div>

        <div>
          <span className={labelClass}>
            Identity Document Type <span className="text-error">*</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {DOC_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="py-2.5 px-4 rounded-lg text-label-sm font-medium text-center bg-surface-container-low text-candidate-text-heading cursor-pointer hover:bg-surface-container transition-colors flex items-center justify-center gap-2 has-[:checked]:bg-candidate-navy-dark has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="rightToWorkDocumentType"
                  value={option.value}
                  checked={docType === option.value}
                  onChange={(e) => set("rightToWorkDocumentType", e.target.value)}
                  className="sr-only"
                />
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {option.icon}
                </span>
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {errors.rightToWorkDocumentType && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.rightToWorkDocumentType}</p>}
        </div>

        {docType === "PASSPORT" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentDropzone
                slot="rightToWorkFront"
                label="Passport (Front Cover)"
                required
                accept="image/jpeg, image/png, application/pdf"
                acceptHint="Accepted: .jpg, .png, .pdf (Max 10MB)"
                initialFilename={values.rightToWorkDocFrontOriginalFilename || null}
                onUploaded={(key, filename) => {
                  set("rightToWorkDocFrontS3Key", key);
                  set("rightToWorkDocFrontOriginalFilename", filename);
                }}
                onRemove={() => {
                  set("rightToWorkDocFrontS3Key", "");
                  set("rightToWorkDocFrontOriginalFilename", "");
                }}
              />
              <DocumentDropzone
                slot="rightToWorkBack"
                label="Passport (Picture Page)"
                required
                accept="image/jpeg, image/png, application/pdf"
                acceptHint="Accepted: .jpg, .png, .pdf (Max 10MB)"
                initialFilename={values.rightToWorkDocBackOriginalFilename || null}
                onUploaded={(key, filename) => {
                  set("rightToWorkDocBackS3Key", key);
                  set("rightToWorkDocBackOriginalFilename", filename);
                }}
                onRemove={() => {
                  set("rightToWorkDocBackS3Key", "");
                  set("rightToWorkDocBackOriginalFilename", "");
                }}
              />
            </div>
            {(errors.rightToWorkDocFrontS3Key || errors.rightToWorkDocBackS3Key) && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.rightToWorkDocFrontS3Key || errors.rightToWorkDocBackS3Key}
              </p>
            )}

            <div className={subBlockClass}>
              <h3 className="text-label-md font-bold uppercase tracking-wider text-candidate-text-heading">
                Online Right to Work &amp; Visa Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass} htmlFor="visa-expiry">
                    Visa Expiry Date <span className="text-error">*</span>
                  </label>
                  <input
                    id="visa-expiry"
                    type="date"
                    className={subInputClass}
                    value={values.visaExpiryDate}
                    onChange={(e) => set("visaExpiryDate", e.target.value)}
                  />
                  {errors.visaExpiryDate && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.visaExpiryDate}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="passport-share-code">
                    Share Code <span className="text-error">*</span>
                  </label>
                  <input
                    id="passport-share-code"
                    className={`${subInputClass} font-mono uppercase`}
                    maxLength={11}
                    placeholder="e.g. W12 345 678"
                    value={values.rightToWorkShareCode}
                    onChange={(e) => set("rightToWorkShareCode", e.target.value.toUpperCase())}
                  />
                  {errors.rightToWorkShareCode && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.rightToWorkShareCode}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="passport-share-code-expiry">
                    Share Code Expiry Date
                  </label>
                  <input
                    id="passport-share-code-expiry"
                    type="date"
                    className={subInputClass}
                    value={values.rightToWorkShareCodeExpiryDate}
                    onChange={(e) => set("rightToWorkShareCodeExpiryDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {docType === "ID_CARD" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentDropzone
                slot="rightToWorkFront"
                label="National ID Card (Front)"
                required
                accept="image/jpeg, image/png, application/pdf"
                acceptHint="Accepted: .jpg, .png, .pdf (Max 10MB)"
                initialFilename={values.rightToWorkDocFrontOriginalFilename || null}
                onUploaded={(key, filename) => {
                  set("rightToWorkDocFrontS3Key", key);
                  set("rightToWorkDocFrontOriginalFilename", filename);
                }}
                onRemove={() => {
                  set("rightToWorkDocFrontS3Key", "");
                  set("rightToWorkDocFrontOriginalFilename", "");
                }}
              />
              <DocumentDropzone
                slot="rightToWorkBack"
                label="National ID Card (Back)"
                required
                accept="image/jpeg, image/png, application/pdf"
                acceptHint="Accepted: .jpg, .png, .pdf (Max 10MB)"
                initialFilename={values.rightToWorkDocBackOriginalFilename || null}
                onUploaded={(key, filename) => {
                  set("rightToWorkDocBackS3Key", key);
                  set("rightToWorkDocBackOriginalFilename", filename);
                }}
                onRemove={() => {
                  set("rightToWorkDocBackS3Key", "");
                  set("rightToWorkDocBackOriginalFilename", "");
                }}
              />
            </div>
            {(errors.rightToWorkDocFrontS3Key || errors.rightToWorkDocBackS3Key) && (
              <p role="alert" aria-live="assertive" className={errorTextClass}>
                {errors.rightToWorkDocFrontS3Key || errors.rightToWorkDocBackS3Key}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="idcard-share-code">
                  Right to Work Share Code <span className="text-error">*</span>
                </label>
                <input
                  id="idcard-share-code"
                  className={`${inputClass} font-mono uppercase`}
                  placeholder="e.g. W12 345 678"
                  value={values.rightToWorkShareCode}
                  onChange={(e) => set("rightToWorkShareCode", e.target.value.toUpperCase())}
                />
                <p className="text-label-sm text-candidate-secondary mt-1">Obtained via GOV.UK Prove your right to work</p>
                {errors.rightToWorkShareCode && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.rightToWorkShareCode}</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="idcard-share-code-expiry">
                  Share Code Expiry Date <span className="text-error">*</span>
                </label>
                <input
                  id="idcard-share-code-expiry"
                  type="date"
                  className={inputClass}
                  value={values.rightToWorkShareCodeExpiryDate}
                  onChange={(e) => set("rightToWorkShareCodeExpiryDate", e.target.value)}
                />
                {errors.rightToWorkShareCodeExpiryDate && (
                  <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.rightToWorkShareCodeExpiryDate}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {docType === "BRP_EVISA" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 bg-surface-container-low p-3 rounded-lg border border-surface-container-high">
              <span className="text-label-sm font-bold text-candidate-text-heading">Residency Verification Subtype:</span>
              <label className="inline-flex items-center cursor-pointer text-label-sm font-medium text-candidate-text-heading">
                <input
                  type="radio"
                  name="brpSubtype"
                  value="PHYSICAL_BRP"
                  checked={values.brpSubtype === "PHYSICAL_BRP"}
                  onChange={(e) => set("brpSubtype", e.target.value)}
                  className="mr-2"
                />
                Physical BRP Card
              </label>
              <label className="inline-flex items-center cursor-pointer text-label-sm font-medium text-candidate-text-heading">
                <input
                  type="radio"
                  name="brpSubtype"
                  value="EVISA"
                  checked={values.brpSubtype === "EVISA"}
                  onChange={(e) => set("brpSubtype", e.target.value)}
                  className="mr-2"
                />
                Digital Status (E-Visa / eVisa)
              </label>
            </div>
            {errors.brpSubtype && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.brpSubtype}</p>}

            {values.brpSubtype === "PHYSICAL_BRP" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentDropzone
                    slot="rightToWorkFront"
                    label="Residence Permit (Front)"
                    required
                    accept="image/jpeg, image/png, application/pdf"
                    acceptHint="Accepted: .jpg, .png, .pdf (Max 10MB)"
                    initialFilename={values.rightToWorkDocFrontOriginalFilename || null}
                    onUploaded={(key, filename) => {
                      set("rightToWorkDocFrontS3Key", key);
                      set("rightToWorkDocFrontOriginalFilename", filename);
                    }}
                    onRemove={() => {
                      set("rightToWorkDocFrontS3Key", "");
                      set("rightToWorkDocFrontOriginalFilename", "");
                    }}
                  />
                  <DocumentDropzone
                    slot="rightToWorkBack"
                    label="Residence Permit (Back)"
                    required
                    accept="image/jpeg, image/png, application/pdf"
                    acceptHint="Accepted: .jpg, .png, .pdf (Max 10MB)"
                    initialFilename={values.rightToWorkDocBackOriginalFilename || null}
                    onUploaded={(key, filename) => {
                      set("rightToWorkDocBackS3Key", key);
                      set("rightToWorkDocBackOriginalFilename", filename);
                    }}
                    onRemove={() => {
                      set("rightToWorkDocBackS3Key", "");
                      set("rightToWorkDocBackOriginalFilename", "");
                    }}
                  />
                </div>
                {(errors.rightToWorkDocFrontS3Key || errors.rightToWorkDocBackS3Key) && (
                  <p role="alert" aria-live="assertive" className={errorTextClass}>
                    {errors.rightToWorkDocFrontS3Key || errors.rightToWorkDocBackS3Key}
                  </p>
                )}
              </>
            )}

            {values.brpSubtype === "EVISA" && (
              <div className={subBlockClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="evisa-share-code">
                      Right to Work Share Code <span className="text-error">*</span>
                    </label>
                    <input
                      id="evisa-share-code"
                      className={`${subInputClass} font-mono uppercase`}
                      placeholder="e.g. W12 345 678"
                      value={values.rightToWorkShareCode}
                      onChange={(e) => set("rightToWorkShareCode", e.target.value.toUpperCase())}
                    />
                    <p className="text-label-sm text-candidate-secondary mt-1">Starts with W, typically 9 characters</p>
                    {errors.rightToWorkShareCode && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.rightToWorkShareCode}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="evisa-status-expiry">
                      Status Expiry Date <span className="text-error">*</span>
                    </label>
                    <input
                      id="evisa-status-expiry"
                      type="date"
                      className={subInputClass}
                      value={values.rightToWorkShareCodeExpiryDate}
                      onChange={(e) => set("rightToWorkShareCodeExpiryDate", e.target.value)}
                    />
                    {errors.rightToWorkShareCodeExpiryDate && (
                      <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.rightToWorkShareCodeExpiryDate}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card: Bank Details */}
      <div className={cardClass}>
        <div>
          <h2 className="text-headline-md text-candidate-text-heading">Bank Details</h2>
        </div>

        <div>
          <label className={labelClass} htmlFor="bank-holder-name">
            Account Holder Name <span className="text-error">*</span>
          </label>
          <input
            id="bank-holder-name"
            className={inputClass}
            placeholder="e.g. James Baldwin"
            value={values.bankAccountHolderName}
            onChange={(e) => set("bankAccountHolderName", e.target.value)}
          />
          {errors.bankAccountHolderName && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.bankAccountHolderName}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="bank-account-number">
              Account Number <span className="text-error">*</span>
            </label>
            <input
              id="bank-account-number"
              className={`${inputClass} font-mono tracking-widest`}
              maxLength={8}
              inputMode="numeric"
              placeholder="e.g. 12345678"
              value={values.bankAccountNumber}
              onChange={(e) => set("bankAccountNumber", e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
            {errors.bankAccountNumber && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.bankAccountNumber}</p>}
          </div>
          <div>
            <label className={labelClass} htmlFor="bank-sort-code">
              Sort Code <span className="text-error">*</span>
            </label>
            <input
              id="bank-sort-code"
              className={`${inputClass} font-mono tracking-widest`}
              maxLength={8}
              inputMode="numeric"
              placeholder="e.g. 20-45-78"
              value={values.bankSortCode}
              onChange={(e) => set("bankSortCode", formatSortCode(e.target.value))}
            />
            {errors.bankSortCode && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.bankSortCode}</p>}
          </div>
        </div>

        <div>
          <DocumentDropzone
            slot="bankStatement"
            label="Proof of Bank Account Details"
            required
            accept="application/pdf"
            acceptHint="Accepted format: PDF only • Max file size: 10MB"
            helperText="Recent bank statement, welcome letter, or certified bank app statement dated within the last 3 months."
            initialFilename={values.bankStatementOriginalFilename || null}
            onUploaded={(key, filename) => {
              set("bankStatementS3Key", key);
              set("bankStatementOriginalFilename", filename);
            }}
            onRemove={() => {
              set("bankStatementS3Key", "");
              set("bankStatementOriginalFilename", "");
            }}
          />
          {errors.bankStatementS3Key && <p role="alert" aria-live="assertive" className={errorTextClass}>{errors.bankStatementS3Key}</p>}
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
            {submitting ? "Submitting..." : "Save & Submit"}
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </div>
      )}
    </form>
  );
}
