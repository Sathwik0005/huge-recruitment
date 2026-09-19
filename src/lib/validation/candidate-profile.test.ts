import { describe, it, expect } from "vitest";
import { parseCandidateProfileInput, candidateProfileContinueSchema, candidateProfileDraftSchema } from "./candidate-profile";

const validContinuePayload = {
  intent: "continue" as const,
  title: "MR",
  firstName: "John",
  middleName: "Robert",
  surname: "Smith",
  gender: "MALE",
  dateOfBirth: "1992-06-14",
  nationality: "GB",
  niNumber: "AB 12 34 56 C",
  isStudying: false,
  hasUnspentConvictions: false,
  mobileDialCode: "+44",
  mobileNumber: "7700 900077",
  addressLine1: "543 Acero Building",
  townOrCity: "Sheffield",
  postcode: "s1 2bj",
};

describe("candidateProfileDraftSchema", () => {
  it("accepts an empty payload aside from intent", () => {
    const result = candidateProfileDraftSchema.safeParse({ intent: "draft" });
    expect(result.success).toBe(true);
  });

  it("accepts a partial payload", () => {
    const result = candidateProfileDraftSchema.safeParse({ intent: "draft", firstName: "John" });
    expect(result.success).toBe(true);
  });
});

describe("candidateProfileContinueSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = candidateProfileContinueSchema.safeParse(validContinuePayload);
    expect(result.success).toBe(true);
  });

  it("normalizes the NI number (strips spaces, uppercases)", () => {
    const result = candidateProfileContinueSchema.safeParse(validContinuePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.niNumber).toBe("AB123456C");
    }
  });

  it("rejects an invalid NI number format", () => {
    const result = candidateProfileContinueSchema.safeParse({ ...validContinuePayload, niNumber: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects a candidate under 16", () => {
    const underage = new Date();
    underage.setFullYear(underage.getFullYear() - 15);
    const result = candidateProfileContinueSchema.safeParse({
      ...validContinuePayload,
      dateOfBirth: underage.toISOString().slice(0, 10),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a candidate exactly 16", () => {
    const sixteen = new Date();
    sixteen.setFullYear(sixteen.getFullYear() - 16);
    sixteen.setDate(sixteen.getDate() - 1);
    const result = candidateProfileContinueSchema.safeParse({
      ...validContinuePayload,
      dateOfBirth: sixteen.toISOString().slice(0, 10),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const { addressLine1: _addressLine1, ...rest } = validContinuePayload;
    const result = candidateProfileContinueSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("uppercases the postcode", () => {
    const result = candidateProfileContinueSchema.safeParse(validContinuePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.postcode).toBe("S1 2BJ");
    }
  });

  it("rejects a postcode that doesn't match the UK postcode shape", () => {
    const result = candidateProfileContinueSchema.safeParse({ ...validContinuePayload, postcode: "NOTAPOSTCODE" });
    expect(result.success).toBe(false);
  });

  it("normalizes a mobile number with spaces/formatting to 10 digits", () => {
    const result = candidateProfileContinueSchema.safeParse({ ...validContinuePayload, mobileNumber: "07700 900077".slice(1) });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mobileNumber).toBe("7700900077");
    }
  });

  it("rejects a mobile number that isn't exactly 10 digits", () => {
    const tooShort = candidateProfileContinueSchema.safeParse({ ...validContinuePayload, mobileNumber: "12345" });
    expect(tooShort.success).toBe(false);

    const tooLong = candidateProfileContinueSchema.safeParse({ ...validContinuePayload, mobileNumber: "770090007712345" });
    expect(tooLong.success).toBe(false);
  });

  it("rejects a date of birth in the future", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = candidateProfileContinueSchema.safeParse({
      ...validContinuePayload,
      dateOfBirth: future.toISOString().slice(0, 10),
    });
    expect(result.success).toBe(false);
  });
});

describe("parseCandidateProfileInput", () => {
  it("routes to the draft schema for intent=draft", () => {
    const result = parseCandidateProfileInput({ intent: "draft" });
    expect(result.success).toBe(true);
  });

  it("routes to the continue schema for intent=continue", () => {
    const result = parseCandidateProfileInput(validContinuePayload);
    expect(result.success).toBe(true);
  });

  it("fails fast when intent is missing/invalid", () => {
    const result = parseCandidateProfileInput({ firstName: "John" });
    expect(result.success).toBe(false);
  });
});
