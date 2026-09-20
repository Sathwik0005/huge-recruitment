import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";

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

/** Parses the response's xlsx buffer back into rows of cell values (row 1 = header). */
async function readSheetRows(response: Response): Promise<unknown[][]> {
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Candidates")!;
  const rows: unknown[][] = [];
  sheet.eachRow((row) => {
    rows.push(row.values as unknown[]);
  });
  return rows;
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

  it("streams an xlsx workbook with the correct headers for an admin caller", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate()] as never);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toMatch(/attachment; filename="candidates-.+\.xlsx"/);
  });

  it("includes a header row and one row per candidate", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate(), makeCandidate({ id: "app-2", fullName: "John Smith" })] as never);

    const response = await GET(makeRequest());
    const rows = await readSheetRows(response);

    expect(rows).toHaveLength(3);
    expect(rows[0].slice(1)).toEqual([
      "Name",
      "Email",
      "Phone",
      "Location",
      "Job",
      "Verification",
      "Status",
      "Applied Date",
    ]);
    expect(rows[1]).toContain("Jane Doe");
    expect(rows[2]).toContain("John Smith");
  });

  it("includes the derived verification bucket alongside the raw status", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ status: ApplicationStatus.HIRED })] as never);

    const response = await GET(makeRequest());
    const rows = await readSheetRows(response);

    expect(rows[1]).toContain("verified");
    expect(rows[1]).toContain(ApplicationStatus.HIRED);
  });

  it.each([
    ["=SUM(A1:A9)", "'=SUM(A1:A9)"],
    ["+1234", "'+1234"],
    ["-1234", "'-1234"],
    ["@cmd", "'@cmd"],
  ])("prefixes a formula-injection-guard quote for a cell starting with %s", async (raw, expected) => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ fullName: raw })] as never);

    const response = await GET(makeRequest());
    const rows = await readSheetRows(response);

    expect(rows[1]).toContain(expected);
  });

  it("does not prefix an ordinary cell", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockFindMany.mockResolvedValue([makeCandidate({ fullName: "Jane Doe" })] as never);

    const response = await GET(makeRequest());
    const rows = await readSheetRows(response);

    expect(rows[1]).toContain("Jane Doe");
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
