import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";
import { getCvBlobStream } from "@/lib/blob";

const UNSAFE_FILENAME_CHARS = /[^\w .-]/g;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  const { id } = await params;
  const application = await prisma.jobApplication.findUnique({ where: { id } });
  if (!application || !application.cvBlobPathname) {
    return NextResponse.json({ error: "No CV found for this application." }, { status: 404 });
  }

  const blob = await getCvBlobStream(application.cvBlobPathname);
  if (!blob) {
    return NextResponse.json({ error: "No CV found for this application." }, { status: 404 });
  }

  // Allowlist word chars, spaces, dots and hyphens only — never trust a
  // client-supplied filename directly in a response header.
  const filename = (application.cvOriginalFilename ?? "cv").replace(UNSAFE_FILENAME_CHARS, "");

  return new NextResponse(blob.stream, {
    status: 200,
    headers: {
      "Content-Type": blob.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
