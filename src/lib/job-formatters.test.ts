import { describe, it, expect } from "vitest";
import {
  formatPayRate,
  formatJobPay,
  formatJobLocation,
  formatEmploymentType,
  formatRelativePostedDate,
  excerptFromOverview,
} from "./job-formatters";

describe("formatPayRate", () => {
  it("formats a single value with no maximum", () => {
    expect(formatPayRate({ minimum: 12.77, maximum: null, period: "HOUR" })).toBe("£12.77 per hour");
  });

  it("formats a range", () => {
    expect(formatPayRate({ minimum: 12.77, maximum: 21.25, period: "HOUR" })).toBe("£12.77 – £21.25 per hour");
  });

  it("works for every pay period", () => {
    expect(formatPayRate({ minimum: 100, maximum: null, period: "DAY" })).toContain("per day");
    expect(formatPayRate({ minimum: 100, maximum: null, period: "WEEK" })).toContain("per week");
    expect(formatPayRate({ minimum: 100, maximum: null, period: "MONTH" })).toContain("per month");
    expect(formatPayRate({ minimum: 100, maximum: null, period: "YEAR" })).toContain("per year");
  });

  it("accepts string decimal values (as they come back from Prisma)", () => {
    expect(formatPayRate({ minimum: "15.33", maximum: "16.00", period: "HOUR" })).toBe(
      "£15.33 – £16.00 per hour"
    );
  });
});

describe("formatJobPay", () => {
  it("returns Competitive for COMPETITIVE pay type", () => {
    expect(formatJobPay({ payType: "COMPETITIVE", payRates: [] })).toBe("Competitive");
  });

  it("uses the primary rate when multiple rates exist", () => {
    const result = formatJobPay({
      payType: "NUMERIC",
      payRates: [
        { minimum: 16.98, maximum: null, period: "HOUR", isPrimary: false },
        { minimum: 12.77, maximum: null, period: "HOUR", isPrimary: true },
      ],
    });
    expect(result).toBe("£12.77 per hour");
  });

  it("falls back to the first rate when none is marked primary", () => {
    const result = formatJobPay({
      payType: "NUMERIC",
      payRates: [{ minimum: 10, maximum: null, period: "HOUR", isPrimary: false }],
    });
    expect(result).toBe("£10.00 per hour");
  });

  it("falls back to Competitive when NUMERIC but no rates exist (should not crash)", () => {
    expect(formatJobPay({ payType: "NUMERIC", payRates: [] })).toBe("Competitive");
  });
});

describe("formatJobLocation", () => {
  it("joins town, county, and postcode", () => {
    expect(
      formatJobLocation({ townOrCity: "Foston", countyOrRegion: "Derbyshire", postcode: "DE65" })
    ).toBe("Foston, Derbyshire, DE65");
  });

  it("omits missing optional parts", () => {
    expect(formatJobLocation({ townOrCity: "Leeds", countyOrRegion: null, postcode: null })).toBe("Leeds");
  });
});

describe("formatEmploymentType", () => {
  it("maps known enum values to display labels", () => {
    expect(formatEmploymentType("TEMP_TO_PERM")).toBe("Temp to Perm");
    expect(formatEmploymentType("PERMANENT")).toBe("Permanent");
  });
});

describe("formatRelativePostedDate", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("says posted today for the same day", () => {
    expect(formatRelativePostedDate(new Date("2026-06-15T08:00:00Z"), now)).toBe("Posted today");
  });

  it("says posted yesterday for exactly 1 day ago", () => {
    expect(formatRelativePostedDate(new Date("2026-06-14T08:00:00Z"), now)).toBe("Posted yesterday");
  });

  it("says N days ago for under a week", () => {
    expect(formatRelativePostedDate(new Date("2026-06-12T08:00:00Z"), now)).toBe("Posted 3 days ago");
  });

  it("falls back to a formatted date for a week or more", () => {
    expect(formatRelativePostedDate(new Date("2026-06-01T08:00:00Z"), now)).toMatch(/Posted \d+ \w+ 2026/);
  });
});

describe("excerptFromOverview", () => {
  it("returns the trimmed text unchanged when under the max length", () => {
    expect(excerptFromOverview("  Short overview.  ", 180)).toBe("Short overview.");
  });

  it("truncates at a word boundary and appends an ellipsis", () => {
    const long = "word ".repeat(50).trim();
    const excerpt = excerptFromOverview(long, 20);
    expect(excerpt.length).toBeLessThanOrEqual(21);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).not.toMatch(/wor…$/);
  });
});
