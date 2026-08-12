"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { CV_PATHNAME_PREFIX, MAX_CV_SIZE_BYTES } from "@/lib/cv-constants";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

type FieldErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  privacyConsent?: string;
  cv?: string;
  form?: string;
};

type CvUploadState =
  | { status: "idle" }
  | { status: "uploading"; fileName: string }
  | { status: "uploaded"; fileName: string; pathname: string; mimeType: string; sizeBytes: number }
  | { status: "error"; message: string };

export function GuestApplicationForm({ jobId, isOpen }: { jobId: string; isOpen: boolean }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [cvState, setCvState] = useState<CvUploadState>({ status: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [publicReference, setPublicReference] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setCvState({ status: "error", message: "Choose a PDF, DOC or DOCX file." });
      event.target.value = "";
      return;
    }
    if (file.size > MAX_CV_SIZE_BYTES) {
      setCvState({ status: "error", message: "Your CV must be 5 MB or smaller." });
      event.target.value = "";
      return;
    }

    setCvState({ status: "uploading", fileName: file.name });
    try {
      const randomPathname = `${CV_PATHNAME_PREFIX}${crypto.randomUUID()}.${extension}`;
      const result = await upload(randomPathname, file, {
        access: "private",
        handleUploadUrl: "/api/applications/cv-upload",
        contentType: file.type,
      });
      setCvState({
        status: "uploaded",
        fileName: file.name,
        pathname: result.pathname,
        mimeType: result.contentType,
        sizeBytes: file.size,
      });
    } catch {
      setCvState({ status: "error", message: "Could not upload your CV. Please try again." });
    }
  }

  function removeCv() {
    setCvState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    const nextErrors: FieldErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Please enter a valid email address.";
    if (!phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!location.trim()) nextErrors.location = "Current location is required.";
    if (!privacyConsent) nextErrors.privacyConsent = "You must accept the Privacy Policy to continue.";
    if (cvState.status === "uploading") nextErrors.cv = "Please wait for your CV to finish uploading.";
    if (cvState.status === "error") nextErrors.cv = cvState.message;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          fullName,
          email,
          phone,
          location,
          privacyConsent,
          companyWebsite,
          cv:
            cvState.status === "uploaded"
              ? {
                  pathname: cvState.pathname,
                  originalFilename: cvState.fileName,
                  mimeType: cvState.mimeType,
                  sizeBytes: cvState.sizeBytes,
                }
              : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors({ form: data.error ?? "Something went wrong. Please try again." });
        setStatus("idle");
        return;
      }

      setPublicReference(data.publicReference);
      setStatus("success");
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
      setStatus("idle");
    }
  }

  if (!isOpen) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 text-center">
        <span aria-hidden="true" className="material-symbols-outlined mb-2 text-[32px] text-outline">
          event_busy
        </span>
        <h2 className="mb-1 text-xl font-bold text-primary">This role is no longer accepting applications</h2>
        <p className="text-on-surface-variant">
          Take a look at our other <Link href="/jobs" className="font-semibold text-primary hover:underline">open jobs</Link>.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 text-center">
        <span aria-hidden="true" className="material-symbols-outlined mb-2 text-[40px] text-secondary">
          task_alt
        </span>
        <h2 className="mb-2 text-xl font-bold text-primary">Application received</h2>
        <p className="mb-2 text-on-surface-variant">Thank you for applying.</p>
        <p className="text-sm text-on-surface-variant">
          Reference: <strong className="text-primary">{publicReference}</strong>
        </p>
        <Link
          href="/jobs"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-lg border border-primary px-5 font-semibold text-primary hover:bg-primary hover:text-on-primary"
        >
          Browse more jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-lg">
      <div className="bg-primary px-5 py-5 text-on-primary">
        <h2 id="apply-heading" className="text-xl font-bold text-white">Apply for this role</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5" noValidate>
        {errors.form && (
          <p role="alert" className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
            {errors.form}
          </p>
        )}

        <div className="sr-only" aria-hidden="true">
          <label htmlFor="company-website">Company website</label>
          <input
            id="company-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="fullName">
            Full name <span aria-hidden="true" className="text-error">*</span>
          </label>
          <input
            id="fullName"
            autoComplete="name"
            maxLength={100}
            className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {errors.fullName && <p className="text-label-sm text-error">{errors.fullName}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="email">
            Email address <span aria-hidden="true" className="text-error">*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p className="text-label-sm text-error">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="phone">
            Phone number <span aria-hidden="true" className="text-error">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && <p className="text-label-sm text-error">{errors.phone}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="location">
            Current location <span aria-hidden="true" className="text-error">*</span>
          </label>
          <input
            id="location"
            autoComplete="address-level2"
            maxLength={120}
            placeholder="Town, city or postcode"
            className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          {errors.location && <p className="text-label-sm text-error">{errors.location}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label htmlFor="cv-upload" className="text-label-md text-on-surface-variant">
              Upload your CV
            </label>
            <span className="text-xs font-medium text-on-surface-variant">Optional</span>
          </div>

          {cvState.status === "idle" || cvState.status === "error" ? (
            <label
              htmlFor="cv-upload"
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface px-4 py-4 text-center hover:border-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined mb-1 text-[28px] text-secondary">
                upload_file
              </span>
              <span className="font-semibold text-primary">Choose a CV</span>
              <span className="mt-1 text-xs text-on-surface-variant">PDF, DOC or DOCX &middot; maximum 5 MB</span>
              <input
                ref={fileInputRef}
                id="cv-upload"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleCvChange}
                className="sr-only"
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-secondary/40 bg-secondary-container/35 p-3">
              <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-[24px] text-primary">
                {cvState.status === "uploading" ? "progress_activity" : "description"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-primary">{cvState.fileName}</p>
                <p className="text-xs text-on-surface-variant">
                  {cvState.status === "uploading" ? "Uploading…" : "Uploaded"}
                </p>
              </div>
              <button type="button" onClick={removeCv} className="flex size-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-white hover:text-error">
                <span className="sr-only">Remove {cvState.fileName}</span>
                <span aria-hidden="true" className="material-symbols-outlined">delete</span>
              </button>
            </div>
          )}
          {errors.cv && <p className="mt-2 text-label-sm text-error">{errors.cv}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-surface p-3 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={privacyConsent}
            onChange={(e) => setPrivacyConsent(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded border-outline-variant text-primary"
          />
          <span>
            I have read and accept the{" "}
            <Link href="/privacy-policy" className="font-semibold text-primary underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </Link>
            . <span aria-hidden="true" className="text-error">*</span>
          </span>
        </label>
        {errors.privacyConsent && <p className="text-label-sm text-error">{errors.privacyConsent}</p>}

        <button
          type="submit"
          disabled={status === "submitting" || cvState.status === "uploading"}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 font-bold text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
