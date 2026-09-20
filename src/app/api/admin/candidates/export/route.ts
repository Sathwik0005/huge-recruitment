import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";
import { buildCandidateWhere, deriveCandidateVerification, type CandidateVerification } from "@/lib/admin-metrics";

const VERIFICATION_VALUES: CandidateVerification[] = ["verified", "pending", "inactive"];
const MAX_ROWS = 1000;

/** Guards against formula injection if a cell is ever re-opened as CSV/plain text downstream. */
function guardFormulaInjection(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Candidates");

  sheet.columns = [
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Location", key: "location", width: 20 },
    { header: "Job", key: "job", width: 24 },
    { header: "Verification", key: "verification", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Applied Date", key: "appliedDate", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const candidate of candidates) {
    sheet.addRow({
      name: guardFormulaInjection(candidate.fullName),
      email: guardFormulaInjection(candidate.email),
      phone: guardFormulaInjection(candidate.phone),
      location: guardFormulaInjection(candidate.location),
      job: guardFormulaInjection(candidate.job.title),
      verification: deriveCandidateVerification(candidate.status),
      status: candidate.status,
      appliedDate: candidate.createdAt.toISOString().slice(0, 10),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `candidates-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
