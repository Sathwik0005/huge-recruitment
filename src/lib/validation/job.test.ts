import { describe, it, expect } from "vitest";
import { jobInputSchema, jobPublishReadinessSchema, payRateInputSchema } from "./job";

const BASE_JOB = {
  title: "Warehouse Operative",
  sectorId: "sector-1",
  employmentType: "PERMANENT",
  overview: "Great role.",
  townOrCity: "Foston",
  payType: "COMPETITIVE",
};

describe("payRateInputSchema", () => {
  it("accepts a valid rate with no maximum", () => {
    expect(payRateInputSchema.safeParse({ minimum: 12.5, period: "HOUR" }).success).toBe(true);
  });

  it("rejects maximum less than minimum", () => {
    const result = payRateInputSchema.safeParse({ minimum: 16, maximum: 15, period: "HOUR" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/greater than or equal to minimum/i);
    }
  });

  it("accepts maximum equal to minimum", () => {
    expect(payRateInputSchema.safeParse({ minimum: 15, maximum: 15, period: "HOUR" }).success).toBe(true);
  });

  it("rejects a non-positive minimum", () => {
    expect(payRateInputSchema.safeParse({ minimum: 0, period: "HOUR" }).success).toBe(false);
    expect(payRateInputSchema.safeParse({ minimum: -5, period: "HOUR" }).success).toBe(false);
  });
});

describe("jobInputSchema", () => {
  it("accepts a minimal valid competitive-pay job", () => {
    expect(jobInputSchema.safeParse(BASE_JOB).success).toBe(true);
  });

  it("rejects a missing title", () => {
    const result = jobInputSchema.safeParse({ ...BASE_JOB, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects numeric pay rates on a COMPETITIVE job", () => {
    const result = jobInputSchema.safeParse({
      ...BASE_JOB,
      payRates: [{ minimum: 10, period: "HOUR", isPrimary: true }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than one primary pay rate", () => {
    const result = jobInputSchema.safeParse({
      ...BASE_JOB,
      payType: "NUMERIC",
      payRates: [
        { minimum: 10, period: "HOUR", isPrimary: true },
        { minimum: 12, period: "HOUR", isPrimary: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero primary pay rates when rates are present", () => {
    const result = jobInputSchema.safeParse({
      ...BASE_JOB,
      payType: "NUMERIC",
      payRates: [{ minimum: 10, period: "HOUR", isPrimary: false }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly one primary pay rate", () => {
    const result = jobInputSchema.safeParse({
      ...BASE_JOB,
      payType: "NUMERIC",
      payRates: [
        { minimum: 10, period: "HOUR", isPrimary: true },
        { minimum: 15, period: "HOUR", isPrimary: false },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a closing date before the start date", () => {
    const result = jobInputSchema.safeParse({
      ...BASE_JOB,
      startDate: "2026-08-01",
      closingDate: "2026-07-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a closing date on or after the start date", () => {
    const result = jobInputSchema.safeParse({
      ...BASE_JOB,
      startDate: "2026-07-01",
      closingDate: "2026-08-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("jobPublishReadinessSchema", () => {
  it("rejects a NUMERIC job with no pay rates", () => {
    const result = jobPublishReadinessSchema.safeParse({ ...BASE_JOB, payType: "NUMERIC" });
    expect(result.success).toBe(false);
  });

  it("accepts a COMPETITIVE job with no pay rates", () => {
    expect(jobPublishReadinessSchema.safeParse(BASE_JOB).success).toBe(true);
  });

  it("accepts a NUMERIC job with a valid primary pay rate", () => {
    const result = jobPublishReadinessSchema.safeParse({
      ...BASE_JOB,
      payType: "NUMERIC",
      payRates: [{ minimum: 12, period: "HOUR", isPrimary: true }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a job missing overview", () => {
    const { overview, ...withoutOverview } = BASE_JOB;
    void overview;
    const result = jobPublishReadinessSchema.safeParse(withoutOverview);
    expect(result.success).toBe(false);
  });
});
