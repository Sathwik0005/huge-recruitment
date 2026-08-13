import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";
import { buildCandidateWhere, deriveCandidateVerification, type CandidateVerification } from "@/lib/admin-metrics";

const VERIFICATION_VALUES: CandidateVerification[] = ["verified", "pending", "inactive"];
const MAX_ROWS = 1000;

/** Escapes a cell for CSV, guarding against formula injection in spreadsheet apps. */
function escapeCsvCell(value: string): string {
  let cell = value;
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  if (/[",\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function toCsvRow(cells: string[]): string {
  return cells.map(escapeCsvCell).join(",");
}

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const sectorId = searchParams.get("sectorId") || undefined;
  const verificationParam = searchParams.get("verification");
  const verification = VERIFICATION_VALUES.includes(verificationParam as CandidateVerification)
    ? (verificationParam as CandidateVerification)
    : undefined;

  const where = buildCandidateWhere({ search, sectorId, verification });

  const candidates = await prisma.jobApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true } } },
    take: MAX_ROWS,
  });

  const header = toCsvRow(["Name", "Email", "Phone", "Location", "Job", "Verification", "Status", "Applied Date"]);
  const rows = candidates.map((candidate) =>
    toCsvRow([
      candidate.fullName,
      candidate.email,
      candidate.phone,
      candidate.location,
      candidate.job.title,
      deriveCandidateVerification(candidate.status),
      candidate.status,
      candidate.createdAt.toISOString().slice(0, 10),
    ])
  );

  const csv = [header, ...rows].join("\r\n");
  const filename = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
