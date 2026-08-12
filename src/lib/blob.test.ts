import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/blob", () => ({
  get: vi.fn(),
  del: vi.fn(),
}));

import { get, del } from "@vercel/blob";
import { matchesCvMagicBytes, verifyUploadedCv, deleteCvBlob, MAX_CV_SIZE_BYTES, CV_PATHNAME_PREFIX } from "./blob";

const mockGet = vi.mocked(get);
const mockDel = vi.mocked(del);

beforeEach(() => {
  vi.clearAllMocks();
});

function streamFor(bytes: Uint8Array) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("matchesCvMagicBytes", () => {
  it("accepts a valid PDF signature", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0]);
    expect(matchesCvMagicBytes(bytes)).toBe(true);
  });

  it("accepts a valid DOCX (zip) signature", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(matchesCvMagicBytes(bytes)).toBe(true);
  });

  it("accepts a valid legacy DOC (OLE) signature", () => {
    const bytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]);
    expect(matchesCvMagicBytes(bytes)).toBe(true);
  });

  it("rejects an executable (MZ header) masquerading as a CV", () => {
    const bytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0]);
    expect(matchesCvMagicBytes(bytes)).toBe(false);
  });

  it("rejects an empty/garbage byte sequence", () => {
    expect(matchesCvMagicBytes(new Uint8Array([0, 0, 0, 0, 0]))).toBe(false);
  });
});

describe("verifyUploadedCv", () => {
  it("rejects when the blob cannot be found", async () => {
    mockGet.mockResolvedValue(null as never);
    const result = await verifyUploadedCv(`${CV_PATHNAME_PREFIX}pathname.pdf`);
    expect(result.ok).toBe(false);
  });

  it("rejects a pathname outside the CV prefix without even calling get()", async () => {
    const result = await verifyUploadedCv("some-other-prefix/pathname.pdf");
    expect(result).toEqual({ ok: false, reason: "invalid-pathname" });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("rejects a blob whose declared size exceeds the maximum", async () => {
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: streamFor(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
      blob: { size: MAX_CV_SIZE_BYTES + 1, contentType: "application/pdf" },
    } as never);
    const result = await verifyUploadedCv(`${CV_PATHNAME_PREFIX}pathname.pdf`);
    expect(result.ok).toBe(false);
  });

  it("rejects a zero-byte blob", async () => {
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: streamFor(new Uint8Array([])),
      blob: { size: 0, contentType: "application/pdf" },
    } as never);
    const result = await verifyUploadedCv(`${CV_PATHNAME_PREFIX}pathname.pdf`);
    expect(result.ok).toBe(false);
  });

  it("rejects when the actual bytes don't match any known CV signature (mismatched/spoofed upload)", async () => {
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: streamFor(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])),
      blob: { size: 100, contentType: "application/pdf" },
    } as never);
    const result = await verifyUploadedCv(`${CV_PATHNAME_PREFIX}pathname.pdf`);
    expect(result).toEqual({ ok: false, reason: "invalid-signature" });
  });

  it("accepts a valid PDF within size limits and returns the verified size/contentType", async () => {
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: streamFor(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3])),
      blob: { size: 8, contentType: "application/pdf" },
    } as never);
    const result = await verifyUploadedCv(`${CV_PATHNAME_PREFIX}pathname.pdf`);
    expect(result).toEqual({ ok: true, size: 8, contentType: "application/pdf" });
  });
});

describe("deleteCvBlob", () => {
  it("calls del with the pathname and never throws even on failure", async () => {
    mockDel.mockRejectedValue(new Error("network error"));
    await expect(deleteCvBlob("some/pathname.pdf")).resolves.toBeUndefined();
    expect(mockDel).toHaveBeenCalledWith("some/pathname.pdf", expect.any(Object));
  });
});
