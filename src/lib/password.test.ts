import { describe, it, expect } from "vitest";
import { validatePassword, PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";

describe("validatePassword", () => {
  it("returns no errors for a password meeting all requirements", () => {
    expect(validatePassword("Str0ng!Pass")).toEqual([]);
  });

  it("flags a password shorter than 8 characters", () => {
    expect(validatePassword("Ab1!")).toContain("Password must be at least 8 characters long.");
  });

  it("flags a password missing an uppercase letter", () => {
    expect(validatePassword("weak1234!")).toContain("Password must include an uppercase letter.");
  });

  it("flags a password missing a lowercase letter", () => {
    expect(validatePassword("WEAK1234!")).toContain("Password must include a lowercase letter.");
  });

  it("flags a password missing a digit", () => {
    expect(validatePassword("Weakpass!")).toContain("Password must include a digit.");
  });

  it("flags a password missing a special character", () => {
    expect(validatePassword("Weakpass1")).toContain("Password must include a special character.");
  });

  it("returns multiple errors for a password failing several rules at once", () => {
    const errors = validatePassword("weak");
    expect(errors.length).toBeGreaterThan(1);
    expect(errors).toContain("Password must be at least 8 characters long.");
    expect(errors).toContain("Password must include an uppercase letter.");
    expect(errors).toContain("Password must include a digit.");
    expect(errors).toContain("Password must include a special character.");
  });

  it("returns an error list (not throw) for an empty string", () => {
    const errors = validatePassword("");
    expect(errors.length).toBe(5);
  });

  it("exposes a human-readable requirements hint", () => {
    expect(PASSWORD_REQUIREMENTS_HINT).toMatch(/8 characters/);
    expect(PASSWORD_REQUIREMENTS_HINT).toMatch(/uppercase/);
    expect(PASSWORD_REQUIREMENTS_HINT).toMatch(/special character/);
  });
});
