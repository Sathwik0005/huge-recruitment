"use client";

import { useState } from "react";

const SECTOR_OPTIONS = [
  "Logistics & Warehousing",
  "Precision Engineering",
  "FMCG Manufacturing",
  "Pharmaceuticals",
  "Construction",
];

export default function EmployerRequestForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant"
    >
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
      <button
        type="submit"
        className={`w-full font-bold py-3 rounded-lg transition-colors ${
          submitted ? "bg-primary text-on-primary" : "bg-primary text-on-primary hover:opacity-90"
        }`}
      >
        {submitted ? "Request Sent Successfully" : "Submit Talent Request"}
      </button>
      <p className="text-caption text-center text-on-surface-variant">
        Our team typically responds within 2 business hours.
      </p>
    </form>
  );
}
