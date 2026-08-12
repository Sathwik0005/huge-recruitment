import { describe, it, expect } from "vitest";
import { guestApplicationSchema } from "./application";

const VALID_INPUT = {
  jobId: "job-1",
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "07123 456789",
  location: "Foston",
  privacyConsent: true as const,
};

describe("guestApplicationSchema", () => {
  it("accepts a minimal valid submission with no CV", () => {
    expect(guestApplicationSchema.safeParse(VALID_INPUT).success).toBe(true);
  });

  it("rejects a missing full name", () => {
    expect(guestApplicationSchema.safeParse({ ...VALID_INPUT, fullName: "" }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(guestApplicationSchema.safeParse({ ...VALID_INPUT, email: "not-an-email" }).success).toBe(false);
  });

  it("normalizes email to lowercase", () => {
    const result = guestApplicationSchema.safeParse({ ...VALID_INPUT, email: "Jane@EXAMPLE.com" });
    expect(result.success && result.data.email).toBe("jane@example.com");
  });

  it("rejects a malformed phone number", () => {
    expect(guestApplicationSchema.safeParse({ ...VALID_INPUT, phone: "abc" }).success).toBe(false);
  });

  it("accepts international phone formats", () => {
    expect(guestApplicationSchema.safeParse({ ...VALID_INPUT, phone: "+44 7123 456789" }).success).toBe(true);
  });

  it("rejects consent set to false", () => {
    expect(guestApplicationSchema.safeParse({ ...VALID_INPUT, privacyConsent: false }).success).toBe(false);
  });

  it("rejects a missing location", () => {
    expect(guestApplicationSchema.safeParse({ ...VALID_INPUT, location: "" }).success).toBe(false);
  });

  it("rejects a filled honeypot field", () => {
    const result = guestApplicationSchema.safeParse({ ...VALID_INPUT, companyWebsite: "https://spam.example" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid optional CV payload", () => {
    const result = guestApplicationSchema.safeParse({
      ...VALID_INPUT,
      cv: {
        pathname: "applications/cv/abc.pdf",
        originalFilename: "resume.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a CV with a disallowed mime type", () => {
    const result = guestApplicationSchema.safeParse({
      ...VALID_INPUT,
      cv: {
        pathname: "applications/cv/abc.exe",
        originalFilename: "resume.exe",
        mimeType: "application/x-msdownload",
        sizeBytes: 1024,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a CV exceeding the maximum size", () => {
    const result = guestApplicationSchema.safeParse({
      ...VALID_INPUT,
      cv: {
        pathname: "applications/cv/abc.pdf",
        originalFilename: "resume.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10 * 1024 * 1024,
      },
    });
    expect(result.success).toBe(false);
  });
});
