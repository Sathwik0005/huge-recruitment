import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findMany: vi.fn(),
    },
  },
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { GET } from "./route";

const mockRequireAdminSession = vi.mocked(requireAdminSession);
const mockFindMany = vi.mocked(prisma.jobApplication.findMany);

const ADMIN_USER = { id: "admin-1", role: "ADMIN", status: "ACTIVE" };

function makeCandidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "app-1",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "07123456789",
    location: "Foston",
    status: ApplicationStatus.NEW,
    createdAt: new Date("2026-01-05T12:00:00Z"),
    job: { title: "Warehouse Operative" },
    ...overrides,
  };
}

function makeRequest(query = "") {
  return new Request(`http://localhost/api/admin/candidates/export${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/candidates/export", () => {
  it("returns 403 for an unauthenticated caller and never queries Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin (forbidden) caller and never queries Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("streams a CSV with the correct headers for an admin caller", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate()]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toMatch(/attachment; filename="candidates-.+\.csv"/);
  });

  it("includes a header row and one row per candidate", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate(), makeCandidate({ id: "app-2", fullName: "John Smith" })]);

    const response = await GET(makeRequest());
    const csv = await response.text();
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("Name,Email,Phone,Location,Job,Verification,Status,Applied Date");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Jane Doe");
    expect(lines[2]).toContain("John Smith");
  });

  it("includes the derived verification bucket alongside the raw status", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ status: ApplicationStatus.HIRED })]);

    const response = await GET(makeRequest());
    const csv = await response.text();

    expect(csv).toContain("verified");
    expect(csv).toContain("HIRED");
  });

  it.each([
    ["=SUM(A1:A9)", "'=SUM(A1:A9)"],
    ["+1234", "'+1234"],
    ["-1234", "'-1234"],
    ["@cmd", "'@cmd"],
  ])("prefixes a formula-injection-guard quote for a cell starting with %s", async (raw, expected) => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ fullName: raw })]);

    const response = await GET(makeRequest());
    const csv = await response.text();

    expect(csv).toContain(expected);
  });

  it("quote-wraps and doubles internal quotes for a cell containing a comma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ location: "Foston, Derbyshire" })]);

    const response = await GET(makeRequest());
    const csv = await response.text();

    expect(csv).toContain('"Foston, Derbyshire"');
  });

  it("quote-wraps and doubles internal quotes for a cell containing a double quote", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ fullName: 'Jane "JJ" Doe' })]);

    const response = await GET(makeRequest());
    const csv = await response.text();

    expect(csv).toContain('"Jane ""JJ"" Doe"');
  });

  it("quote-wraps a cell containing a newline", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ location: "Line1\nLine2" })]);

    const response = await GET(makeRequest());
    const csv = await response.text();

    expect(csv).toContain('"Line1\nLine2"');
  });

  it("does not quote-wrap or prefix an ordinary cell", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ fullName: "Jane Doe" })]);

    const response = await GET(makeRequest());
    const csv = await response.text();
    const dataLine = csv.split("\r\n")[1];

    expect(dataLine.startsWith("Jane Doe,")).toBe(true);
  });

  it("caps the exported rows at 1000 via the Prisma query", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest());

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1000 }));
  });

  it("passes the search/sectorId/verification query params through to the shared filter builder", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest("?search=jane&sectorId=sector-1&verification=verified"));

    const callArgs = mockFindMany.mock.calls[0][0] as { where: unknown };
    expect(callArgs.where).toEqual({
      AND: [
        {
          OR: [
            { fullName: { contains: "jane", mode: "insensitive" } },
            { email: { contains: "jane", mode: "insensitive" } },
          ],
        },
        { job: { sectorId: "sector-1" } },
        { status: { in: [ApplicationStatus.SHORTLISTED, ApplicationStatus.HIRED] } },
      ],
    });
  });

  it("ignores an invalid verification query param rather than throwing", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest("?verification=not-a-real-status"));

    expect(response.status).toBe(200);
    const callArgs = mockFindMany.mock.calls[0][0] as { where: unknown };
    expect(callArgs.where).toEqual({});
  });
});
