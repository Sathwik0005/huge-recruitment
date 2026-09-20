import { describe, it, expect } from "vitest";
import {
  adminStep1Schema,
  adminStep2Schema,
  adminStep3Schema,
  adminWorkReferenceSchema,
} from "./admin-candidate-profile";

describe("adminStep1Schema", () => {
  it("accepts an empty object because every field is optional via .partial()", () => {
    const result = adminStep1Schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a single valid field without requiring the rest of step 1", () => {
    const result = adminStep1Schema.safeParse({ firstName: "Jordan" });
    expect(result.success).toBe(true);
  });

  it("does not accept an `intent` field (omitted from the admin schema)", () => {
    const result = adminStep1Schema.safeParse({ intent: "continue" });
    // extra/omitted keys are simply stripped by default zod object parsing,
    // so this should still succeed but the parsed data must not carry intent.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("intent");
    }
  });

  it("accepts a valid UK NI number when supplied", () => {
    const result = adminStep1Schema.safeParse({ niNumber: "AB123456C" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.niNumber).toBe("AB123456C");
  });

  it("rejects an invalid NI number format using the same regex as the candidate-facing schema", () => {
    const result = adminStep1Schema.safeParse({ niNumber: "QQ123456C" });
    expect(result.success).toBe(false);
  });

  it("rejects an NI number with an invalid suffix letter", () => {
    const result = adminStep1Schema.safeParse({ niNumber: "AB123456Z" });
    expect(result.success).toBe(false);
  });

  it("rejects a mobile number that isn't exactly 10 digits", () => {
    const result = adminStep1Schema.safeParse({ mobileNumber: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid UK postcode when supplied", () => {
    const result = adminStep1Schema.safeParse({ postcode: "NOTAPOSTCODE" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid UK postcode and uppercases it", () => {
    const result = adminStep1Schema.safeParse({ postcode: "s1 2bj" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.postcode).toBe("S1 2BJ");
  });

  it("rejects an out-of-range gender enum value", () => {
    const result = adminStep1Schema.safeParse({ gender: "UNKNOWN" });
    expect(result.success).toBe(false);
  });
});

describe("adminStep2Schema", () => {
  it("accepts an empty object because every field is optional via .partial()", () => {
    const result = adminStep2Schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("excludes workReferences (handled by a separate action/schema)", () => {
    const result = adminStep2Schema.safeParse({ workReferences: [{ jobTitle: "x" }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("workReferences");
    }
  });

  it("rejects a shoe size not in 0.5 increments", () => {
    const result = adminStep2Schema.safeParse({ shoeSize: 7.3 });
    expect(result.success).toBe(false);
  });

  it("accepts a valid half-size shoe size", () => {
    const result = adminStep2Schema.safeParse({ shoeSize: 8.5 });
    expect(result.success).toBe(true);
  });

  it("rejects a shoe size below the minimum", () => {
    const result = adminStep2Schema.safeParse({ shoeSize: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects an emergency contact mobile that isn't exactly 10 digits", () => {
    const result = adminStep2Schema.safeParse({ emergencyContactMobile: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid emergency contact mobile", () => {
    const result = adminStep2Schema.safeParse({ emergencyContactMobile: "7123456789" });
    expect(result.success).toBe(true);
  });

  it("rejects an interestedSectors value outside the shared SectorName enum", () => {
    const result = adminStep2Schema.safeParse({ interestedSectors: ["NOT_A_SECTOR"] });
    expect(result.success).toBe(false);
  });

  it("accepts a valid interestedSectors array", () => {
    const result = adminStep2Schema.safeParse({ interestedSectors: ["WAREHOUSING", "PRODUCTION"] });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid transportMode enum value", () => {
    const result = adminStep2Schema.safeParse({ transportMode: "SPACESHIP" });
    expect(result.success).toBe(false);
  });
});

describe("adminStep3Schema", () => {
  it("accepts an empty object because every field is independently optional", () => {
    const result = adminStep3Schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid 9-character share code and normalizes it", () => {
    const result = adminStep3Schema.safeParse({ rightToWorkShareCode: "w12 345 678" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rightToWorkShareCode).toBe("W12345678");
  });

  it("rejects a share code that isn't exactly 9 alphanumeric characters", () => {
    const result = adminStep3Schema.safeParse({ rightToWorkShareCode: "SHORT" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid 8-digit bank account number", () => {
    const result = adminStep3Schema.safeParse({ bankAccountNumber: "12345678" });
    expect(result.success).toBe(true);
  });

  it("rejects a bank account number that is not exactly 8 digits", () => {
    const result = adminStep3Schema.safeParse({ bankAccountNumber: "1234567" });
    expect(result.success).toBe(false);
  });

  it("rejects a bank account number containing non-digit characters", () => {
    const result = adminStep3Schema.safeParse({ bankAccountNumber: "1234567A" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid 6-digit sort code with dashes stripped", () => {
    const result = adminStep3Schema.safeParse({ bankSortCode: "12-34-56" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bankSortCode).toBe("123456");
  });

  it("rejects a sort code that isn't exactly 6 digits once dashes are stripped", () => {
    const result = adminStep3Schema.safeParse({ bankSortCode: "12-34-5" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid rightToWorkDocumentType enum value", () => {
    const result = adminStep3Schema.safeParse({ rightToWorkDocumentType: "DRIVING_LICENCE" });
    expect(result.success).toBe(false);
  });

  it("does not enforce document-type-conditional completeness (that superRefine belongs to the submit schema only)", () => {
    // A partial admin edit setting only rightToWorkDocumentType, with none of
    // the branch-specific required fields, must still succeed — the spec is
    // explicit that cross-field completeness doesn't belong in admin partial edits.
    const result = adminStep3Schema.safeParse({ rightToWorkDocumentType: "PASSPORT" });
    expect(result.success).toBe(true);
  });
});

describe("adminWorkReferenceSchema", () => {
  const validReference = {
    jobTitle: "Warehouse Operative",
    companyName: "Acme Logistics",
    startDate: "2023-01-01",
    isCurrentJob: false,
    endDate: "2023-06-01",
  };

  it("accepts a fully valid work reference row", () => {
    const result = adminWorkReferenceSchema.safeParse(validReference);
    expect(result.success).toBe(true);
  });

  it("is not partial — jobTitle is still required", () => {
    const { jobTitle: _jobTitle, ...rest } = validReference;
    const result = adminWorkReferenceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("is not partial — companyName is still required", () => {
    const { companyName: _companyName, ...rest } = validReference;
    const result = adminWorkReferenceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("requires endDate unless isCurrentJob is true", () => {
    const result = adminWorkReferenceSchema.safeParse({
      ...validReference,
      isCurrentJob: false,
      endDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a supplied endDate when isCurrentJob is true", () => {
    const result = adminWorkReferenceSchema.safeParse({
      ...validReference,
      isCurrentJob: true,
      endDate: "2023-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts isCurrentJob true with no endDate", () => {
    const result = adminWorkReferenceSchema.safeParse({
      ...validReference,
      isCurrentJob: true,
      endDate: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a manager mobile that isn't exactly 10 digits when supplied", () => {
    const result = adminWorkReferenceSchema.safeParse({
      ...validReference,
      managerMobile: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid manager email when supplied", () => {
    const result = adminWorkReferenceSchema.safeParse({
      ...validReference,
      managerEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});
