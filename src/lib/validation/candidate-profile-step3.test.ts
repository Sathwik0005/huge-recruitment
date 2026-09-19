import { describe, it, expect } from "vitest";
import { parseCandidateProfileStep3Input } from "./candidate-profile-step3";

const validBank = {
  bankAccountHolderName: "Sathwik User",
  bankAccountNumber: "12345678",
  bankSortCode: "20-45-78",
  bankStatementS3Key: "candidates/user-1/step-3/bankStatement/x.pdf",
};

describe("parseCandidateProfileStep3Input", () => {
  it("rejects an unrecognized intent", () => {
    const result = parseCandidateProfileStep3Input({ intent: "continue" });
    expect(result.success).toBe(false);
  });

  it("draft: accepts an empty payload", () => {
    const result = parseCandidateProfileStep3Input({ intent: "draft" });
    expect(result.success).toBe(true);
  });

  it("draft: accepts a partial payload with no branch enforcement", () => {
    const result = parseCandidateProfileStep3Input({ intent: "draft", rightToWorkDocumentType: "PASSPORT" });
    expect(result.success).toBe(true);
  });

  it("submit: requires a document type to be selected", () => {
    const result = parseCandidateProfileStep3Input({ intent: "submit", ...validBank });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "rightToWorkDocumentType")).toBe(true);
    }
  });

  describe("passport branch", () => {
    it("requires front/back keys, visa expiry, and share code", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "PASSPORT",
        ...validBank,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path[0]);
        expect(paths).toEqual(
          expect.arrayContaining(["rightToWorkDocFrontS3Key", "rightToWorkDocBackS3Key", "visaExpiryDate", "rightToWorkShareCode"]),
        );
        expect(paths).not.toContain("rightToWorkShareCodeExpiryDate");
      }
    });

    it("succeeds with all required fields present", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "PASSPORT",
        rightToWorkDocFrontS3Key: "k1",
        rightToWorkDocBackS3Key: "k2",
        visaExpiryDate: "2030-01-01",
        rightToWorkShareCode: "W12345678",
        ...validBank,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("id card branch", () => {
    it("requires front/back keys, share code, and its expiry", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "ID_CARD",
        ...validBank,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path[0]);
        expect(paths).toEqual(
          expect.arrayContaining([
            "rightToWorkDocFrontS3Key",
            "rightToWorkDocBackS3Key",
            "rightToWorkShareCode",
            "rightToWorkShareCodeExpiryDate",
          ]),
        );
      }
    });

    it("succeeds with all required fields present", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "ID_CARD",
        rightToWorkDocFrontS3Key: "k1",
        rightToWorkDocBackS3Key: "k2",
        rightToWorkShareCode: "W12345678",
        rightToWorkShareCodeExpiryDate: "2030-01-01",
        ...validBank,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("brp/e-visa branch", () => {
    it("requires a brpSubtype selection", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "BRP_EVISA",
        ...validBank,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === "brpSubtype")).toBe(true);
      }
    });

    it("physical: requires front/back keys only", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "BRP_EVISA",
        brpSubtype: "PHYSICAL_BRP",
        ...validBank,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path[0]);
        expect(paths).toEqual(expect.arrayContaining(["rightToWorkDocFrontS3Key", "rightToWorkDocBackS3Key"]));
        expect(paths).not.toContain("rightToWorkShareCode");
      }

      const success = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "BRP_EVISA",
        brpSubtype: "PHYSICAL_BRP",
        rightToWorkDocFrontS3Key: "k1",
        rightToWorkDocBackS3Key: "k2",
        ...validBank,
      });
      expect(success.success).toBe(true);
    });

    it("e-visa: requires share code + expiry only", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "BRP_EVISA",
        brpSubtype: "EVISA",
        ...validBank,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path[0]);
        expect(paths).toEqual(expect.arrayContaining(["rightToWorkShareCode", "rightToWorkShareCodeExpiryDate"]));
        expect(paths).not.toContain("rightToWorkDocFrontS3Key");
      }

      const success = parseCandidateProfileStep3Input({
        intent: "submit",
        rightToWorkDocumentType: "BRP_EVISA",
        brpSubtype: "EVISA",
        rightToWorkShareCode: "W12345678",
        rightToWorkShareCodeExpiryDate: "2030-01-01",
        ...validBank,
      });
      expect(success.success).toBe(true);
    });
  });

  describe("bank details", () => {
    const passportDocs = {
      rightToWorkDocumentType: "PASSPORT",
      rightToWorkDocFrontS3Key: "k1",
      rightToWorkDocBackS3Key: "k2",
      visaExpiryDate: "2030-01-01",
      rightToWorkShareCode: "W12345678",
    };

    it("requires holder name, account number, sort code, and statement regardless of branch", () => {
      const result = parseCandidateProfileStep3Input({ intent: "submit", ...passportDocs });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path[0]);
        expect(paths).toEqual(
          expect.arrayContaining(["bankAccountHolderName", "bankAccountNumber", "bankSortCode", "bankStatementS3Key"]),
        );
      }
    });

    it("rejects an account number that isn't 8 digits", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        ...passportDocs,
        ...validBank,
        bankAccountNumber: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a sort code with or without dashes", () => {
      const withDashes = parseCandidateProfileStep3Input({
        intent: "submit",
        ...passportDocs,
        ...validBank,
        bankSortCode: "20-45-78",
      });
      expect(withDashes.success).toBe(true);

      const withoutDashes = parseCandidateProfileStep3Input({
        intent: "submit",
        ...passportDocs,
        ...validBank,
        bankSortCode: "204578",
      });
      expect(withoutDashes.success).toBe(true);
    });

    it("rejects a sort code that isn't 6 digits", () => {
      const result = parseCandidateProfileStep3Input({
        intent: "submit",
        ...passportDocs,
        ...validBank,
        bankSortCode: "12-34",
      });
      expect(result.success).toBe(false);
    });
  });
});
