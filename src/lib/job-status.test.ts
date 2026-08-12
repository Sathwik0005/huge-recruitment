import { describe, it, expect } from "vitest";
import { isValidJobStatusTransition, isJobPubliclyVisible } from "./job-status";
import { JobStatus } from "@/generated/prisma/enums";

describe("isValidJobStatusTransition", () => {
  it("allows DRAFT -> PUBLISHED", () => {
    expect(isValidJobStatusTransition(JobStatus.DRAFT, JobStatus.PUBLISHED)).toBe(true);
  });

  it("allows PUBLISHED -> PAUSED, CLOSED, ARCHIVED", () => {
    expect(isValidJobStatusTransition(JobStatus.PUBLISHED, JobStatus.PAUSED)).toBe(true);
    expect(isValidJobStatusTransition(JobStatus.PUBLISHED, JobStatus.CLOSED)).toBe(true);
    expect(isValidJobStatusTransition(JobStatus.PUBLISHED, JobStatus.ARCHIVED)).toBe(true);
  });

  it("allows PAUSED/CLOSED -> DRAFT (restore)", () => {
    expect(isValidJobStatusTransition(JobStatus.PAUSED, JobStatus.DRAFT)).toBe(true);
    expect(isValidJobStatusTransition(JobStatus.CLOSED, JobStatus.DRAFT)).toBe(true);
  });

  it("never allows a transition out of ARCHIVED", () => {
    expect(isValidJobStatusTransition(JobStatus.ARCHIVED, JobStatus.DRAFT)).toBe(false);
    expect(isValidJobStatusTransition(JobStatus.ARCHIVED, JobStatus.PUBLISHED)).toBe(false);
  });

  it("rejects DRAFT -> CLOSED (must go through PUBLISHED)", () => {
    expect(isValidJobStatusTransition(JobStatus.DRAFT, JobStatus.CLOSED)).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(isValidJobStatusTransition(JobStatus.PUBLISHED, JobStatus.PUBLISHED)).toBe(false);
  });
});

describe("isJobPubliclyVisible", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("is false when status is not PUBLISHED", () => {
    expect(isJobPubliclyVisible({ status: JobStatus.DRAFT, startDate: null, closingDate: null }, now)).toBe(false);
    expect(isJobPubliclyVisible({ status: JobStatus.PAUSED, startDate: null, closingDate: null }, now)).toBe(false);
  });

  it("is true when PUBLISHED with no date window", () => {
    expect(isJobPubliclyVisible({ status: JobStatus.PUBLISHED, startDate: null, closingDate: null }, now)).toBe(
      true
    );
  });

  it("is false when startDate is in the future", () => {
    expect(
      isJobPubliclyVisible(
        { status: JobStatus.PUBLISHED, startDate: new Date("2026-07-01"), closingDate: null },
        now
      )
    ).toBe(false);
  });

  it("is true when startDate is exactly now", () => {
    expect(
      isJobPubliclyVisible({ status: JobStatus.PUBLISHED, startDate: now, closingDate: null }, now)
    ).toBe(true);
  });

  it("is false when closingDate is in the past", () => {
    expect(
      isJobPubliclyVisible(
        { status: JobStatus.PUBLISHED, startDate: null, closingDate: new Date("2026-06-01") },
        now
      )
    ).toBe(false);
  });

  it("is true when closingDate is exactly now", () => {
    expect(
      isJobPubliclyVisible({ status: JobStatus.PUBLISHED, startDate: null, closingDate: now }, now)
    ).toBe(true);
  });
});
