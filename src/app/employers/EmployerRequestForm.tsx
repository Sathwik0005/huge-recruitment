"use client";

import { useState } from "react";

const SECTOR_OPTIONS = [
  "Warehousing",
  "Distribution",
  "Manufacturing",
  "Production",
  "Automotive",
  "Other",
];

export default function EmployerRequestForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/employer-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          companyEmail: formData.get("companyEmail"),
          sector: formData.get("sector"),
          requirementDetail: formData.get("requirementDetail") ?? "",
          companyWebsite: formData.get("companyWebsite") ?? "",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(data?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("submitted");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="[perspective:1500px]">
      <div
        className={`relative transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${
          status === "submitted" ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant [backface-visibility:hidden]"
        >
          <input
            type="text"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
            className="absolute left-[-9999px] w-px h-px opacity-0"
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="John Doe"
                className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-2 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="companyEmail">
                Company Email
              </label>
              <input
                id="companyEmail"
                name="companyEmail"
                type="email"
                required
                placeholder="john@company.com"
                className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-2 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="sector">
              Industry Sector
            </label>
            <select
              id="sector"
              name="sector"
              className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-2 outline-none"
            >
              {SECTOR_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="requirementDetail">
              Requirement Detail
            </label>
            <textarea
              id="requirementDetail"
              name="requirementDetail"
              rows={4}
              placeholder="Tell us about the roles you need to fill..."
              className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-2 outline-none"
            />
          </div>

          {status === "error" && errorMessage && (
            <p className="text-body-md text-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full font-bold py-3 rounded-lg transition-colors bg-primary text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {status === "submitting" ? "Sending..." : "Submit Talent Request"}
          </button>
          <p className="text-caption text-center text-on-surface-variant">
            Our team typically responds within 2 business hours.
          </p>
        </form>

        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant p-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-status-success flex items-center justify-center">
            <span className="material-symbols-outlined text-status-success text-[32px]">check</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-primary">Request Sent Successfully</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
            Thank you for reaching out. Our team will review your requirement and get back to you as
            soon as possible.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="mt-2 bg-primary text-on-primary font-label-md text-label-md font-bold py-2.5 px-6 rounded-lg hover:opacity-90 transition-colors"
          >
            Send Another Request
          </button>
        </div>
      </div>
    </div>
  );
}
