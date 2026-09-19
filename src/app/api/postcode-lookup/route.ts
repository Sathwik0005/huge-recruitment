import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";

interface PostcodesIoResult {
  postcode: string;
  admin_district: string | null;
  region: string | null;
}

/**
 * Server-side proxy to postcodes.io (free, keyless UK postcode lookup). Kept
 * server-side rather than called directly from the browser so the dependency
 * stays swappable and rate-limited like every other endpoint here.
 */
export async function GET(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("postcodeLookup", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const session = await requireVerifiedSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPostcode = searchParams.get("postcode");
  if (!rawPostcode || !rawPostcode.trim()) {
    return NextResponse.json({ error: "A postcode is required." }, { status: 400 });
  }

  const normalized = rawPostcode.replace(/\s+/g, "").toUpperCase();

  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 404) {
      return NextResponse.json({ error: "Postcode not found." }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Postcode lookup failed. Please try again." }, { status: 502 });
    }

    const data = (await response.json()) as { result: PostcodesIoResult };
    return NextResponse.json({
      townOrCity: data.result.admin_district ?? "",
      countyOrRegion: data.result.region ?? "",
      postcode: data.result.postcode,
    });
  } catch (error) {
    console.error("Postcode lookup failed", {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Postcode lookup failed. Please try again." }, { status: 502 });
  }
}
