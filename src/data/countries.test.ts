import { describe, it, expect } from "vitest";
import { COUNTRIES } from "./countries";

describe("COUNTRIES", () => {
  it("has roughly the expected number of internationally recognised countries", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(190);
    expect(COUNTRIES.length).toBeLessThanOrEqual(200);
  });

  it("has no duplicate codes", () => {
    const codes = COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has no duplicate names", () => {
    const names = COUNTRIES.map((country) => country.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses a valid ISO 3166-1 alpha-2 shape for every code", () => {
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("is sorted alphabetically by name", () => {
    const names = COUNTRIES.map((country) => country.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("includes the countries referenced elsewhere in the app", () => {
    const codes = new Set(COUNTRIES.map((country) => country.code));
    for (const code of ["GB", "IN", "US", "PK", "IE", "FR", "DE", "PL", "RO"]) {
      expect(codes.has(code)).toBe(true);
    }
  });
});
