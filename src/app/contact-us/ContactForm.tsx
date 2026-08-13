"use client";

import { useState } from "react";

const REASON_OPTIONS = [
  { value: "hiring", label: "Hiring Talent" },
  { value: "working", label: "Looking for Work" },
  { value: "general", label: "General Enquiry" },
  { value: "other", label: "Other" },
];

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <button
        type="submit"
        className="w-full sm:w-auto bg-primary text-on-primary hover:opacity-90 font-label-md text-label-md font-bold py-3.5 px-10 rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
      >
        {submitted ? (
          "Message Sent — Thank You!"
        ) : (
          <>
            Submit Message
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </>
        )}
      </button>
    </form>
  );
}
