import { describe, it, expect } from "vitest";
import {
  isAllowedDocumentContentType,
  buildDocumentKey,
  matchesDocumentMagicBytes,
  MAX_DOCUMENT_SIZE_BYTES,
} from "./candidate-documents";

describe("isAllowedDocumentContentType", () => {
  it("accepts jpg/png/pdf for rightToWorkFront", () => {
    expect(isAllowedDocumentContentType("rightToWorkFront", "image/jpeg")).toBe(true);
    expect(isAllowedDocumentContentType("rightToWorkFront", "image/png")).toBe(true);
    expect(isAllowedDocumentContentType("rightToWorkFront", "application/pdf")).toBe(true);
  });

  it("accepts jpg/png/pdf for rightToWorkBack", () => {
    expect(isAllowedDocumentContentType("rightToWorkBack", "image/jpeg")).toBe(true);
    expect(isAllowedDocumentContentType("rightToWorkBack", "image/png")).toBe(true);
    expect(isAllowedDocumentContentType("rightToWorkBack", "application/pdf")).toBe(true);
  });

  it("only accepts pdf for bankStatement", () => {
    expect(isAllowedDocumentContentType("bankStatement", "application/pdf")).toBe(true);
    expect(isAllowedDocumentContentType("bankStatement", "image/jpeg")).toBe(false);
    expect(isAllowedDocumentContentType("bankStatement", "image/png")).toBe(false);
  });

  it("rejects unsupported content types for every slot", () => {
    expect(isAllowedDocumentContentType("rightToWorkFront", "image/gif")).toBe(false);
    expect(isAllowedDocumentContentType("bankStatement", "image/gif")).toBe(false);
  });
});

describe("buildDocumentKey", () => {
  it("scopes the key under candidates/<userId>/step-3/<slot>/ with the right extension", () => {
    expect(buildDocumentKey("user-1", "rightToWorkFront", "image/jpeg")).toMatch(
      /^candidates\/user-1\/step-3\/rightToWorkFront\/.+\.jpg$/,
    );
    expect(buildDocumentKey("user-1", "bankStatement", "application/pdf")).toMatch(
      /^candidates\/user-1\/step-3\/bankStatement\/.+\.pdf$/,
    );
  });
});

describe("matchesDocumentMagicBytes", () => {
  it("validates a PNG header", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(matchesDocumentMagicBytes(buffer, "image/png")).toBe(true);
  });

  it("validates a JPEG header", () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0, 0]);
    expect(matchesDocumentMagicBytes(buffer, "image/jpeg")).toBe(true);
  });

  it("validates a PDF header", () => {
    const buffer = Buffer.from("%PDF-1.4\n");
    expect(matchesDocumentMagicBytes(buffer, "application/pdf")).toBe(true);
  });

  it("rejects a mismatched header", () => {
    const buffer = Buffer.from([0, 0, 0, 0]);
    expect(matchesDocumentMagicBytes(buffer, "image/png")).toBe(false);
    expect(matchesDocumentMagicBytes(buffer, "application/pdf")).toBe(false);
  });

  it("rejects a too-short buffer", () => {
    expect(matchesDocumentMagicBytes(Buffer.from([1, 2]), "application/pdf")).toBe(false);
  });

  it("exposes a 10MB max size", () => {
    expect(MAX_DOCUMENT_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});
