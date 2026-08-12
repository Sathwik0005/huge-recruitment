import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn().mockReturnValue("1.2.3.4"),
}));

const mockHandleUpload = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  handleUpload: (...args: unknown[]) => mockHandleUpload(...args),
}));

import { checkRateLimit } from "@/lib/rate-limit";
import { ALLOWED_CV_CONTENT_TYPES, MAX_CV_SIZE_BYTES, CV_PATHNAME_PREFIX } from "@/lib/blob";
import { POST } from "./route";

const mockCheckRateLimit = vi.mocked(checkRateLimit);

function request(body: unknown) {
  return new Request("http://localhost/api/applications/cv-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(true);
  mockHandleUpload.mockResolvedValue({ type: "blob.generate-client-token", clientToken: "token" });
});

describe("POST /api/applications/cv-upload", () => {
  it("rejects when rate limited before touching handleUpload", async () => {
    mockCheckRateLimit.mockResolvedValue(false);
    const response = await POST(request({ type: "blob.generate-client-token" }));
    expect(response.status).toBe(429);
    expect(mockHandleUpload).not.toHaveBeenCalled();
  });

  it("passes the allowed content types and max size to handleUpload's token config", async () => {
    await POST(request({ type: "blob.generate-client-token" }));

    expect(mockHandleUpload).toHaveBeenCalledTimes(1);
    const options = mockHandleUpload.mock.calls[0][0];
    const tokenConfig = await options.onBeforeGenerateToken(`${CV_PATHNAME_PREFIX}abc.pdf`, null, false);

    expect(tokenConfig.allowedContentTypes).toEqual([...ALLOWED_CV_CONTENT_TYPES]);
    expect(tokenConfig.maximumSizeInBytes).toBe(MAX_CV_SIZE_BYTES);
  });

  it("rejects a pathname outside the CV prefix at token-issuance time", async () => {
    await POST(request({ type: "blob.generate-client-token" }));

    const options = mockHandleUpload.mock.calls[0][0];
    await expect(options.onBeforeGenerateToken("some-other-prefix/abc.pdf", null, false)).rejects.toThrow();
  });

  it("returns 400 when handleUpload rejects (e.g. disallowed type/oversized declared size)", async () => {
    mockHandleUpload.mockRejectedValue(new Error("Invalid content type"));
    const response = await POST(request({ type: "blob.generate-client-token" }));
    expect(response.status).toBe(400);
  });
});
