"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

const REASON_OPTIONS = [
  { value: "hiring", label: "Hiring Talent" },
  { value: "working", label: "Looking for Work" },
  { value: "general", label: "General Enquiry" },
  { value: "other", label: "Other" },
];

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const reason = formData.get("reason");

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          company: formData.get("company") ?? "",
          email: formData.get("email"),
          phone: formData.get("phone"),
          reason,
          message: formData.get("message"),
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
      trackEvent("contact_form_submitted", { reason: typeof reason === "string" ? reason : "unknown" });
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
        <form onSubmit={handleSubmit} className="space-y-6 [backface-visibility:hidden]">
          <input
            type="text"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
            className="absolute left-[-9999px] w-px h-px opacity-0"
            aria-hidden="true"
          />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="name">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Jane Smith"
                className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 outline-none bg-surface-container-lowest"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="company">
                Company Name (Optional)
              </label>
              <input
                id="company"
                name="company"
                type="text"
                placeholder="Acme Ltd"
                className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 outline-none bg-surface-container-lowest"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="jane@company.com"
                className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 outline-none bg-surface-container-lowest"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="phone">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="+44 7000 000000"
                className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 outline-none bg-surface-container-lowest"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="reason">
              Reason for Contact *
            </label>
            <select
              id="reason"
              name="reason"
              required
              defaultValue=""
              className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 outline-none bg-surface-container-lowest"
            >
              <option value="" disabled>
                Select an option
              </option>
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="message">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              placeholder="Tell us how we can help..."
              className="w-full border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 outline-none resize-none bg-surface-container-lowest"
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
            className="w-full sm:w-auto bg-primary text-on-primary hover:opacity-90 disabled:opacity-60 font-label-md text-label-md font-bold py-3.5 px-10 rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
          >
            {status === "submitting" ? (
              "Sending..."
            ) : (
              <>
                Submit Message
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center text-center gap-4 px-4">
          <div className="w-16 h-16 rounded-full border-4 border-status-success flex items-center justify-center">
            <span className="material-symbols-outlined text-status-success text-[32px]">check</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-primary">We&apos;ve Received Your Message</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
            Thank you for contacting Huge Recruitment. Our team will review your enquiry and get back
            to you as soon as possible.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="mt-2 bg-primary text-on-primary font-label-md text-label-md font-bold py-2.5 px-6 rounded-lg hover:opacity-90 transition-colors"
          >
            Send Another Message
          </button>
        </div>
      </div>
    </div>
  );
}
