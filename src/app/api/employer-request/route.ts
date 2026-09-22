import { NextResponse } from "next/server";
import { sendEmployerRequestNotification } from "@/lib/email";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { employerRequestSchema } from "@/lib/validation/contact";

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("employerRequest", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: reject silently as a generic validation error, never tipping
  // off automated submitters that this specific field was the trigger.
  if (
    typeof body === "object" &&
    body !== null &&
    "companyWebsite" in body &&
    typeof (body as { companyWebsite?: unknown }).companyWebsite === "string" &&
    (body as { companyWebsite: string }).companyWebsite.length > 0
  ) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  const parsed = employerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." }, { status: 400 });
  }
  const input = parsed.data;

  await sendEmployerRequestNotification({
    fullName: input.fullName,
    companyEmail: input.companyEmail,
    sector: input.sector,
    requirementDetail: input.requirementDetail,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
