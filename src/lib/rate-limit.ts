import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimiters: { applications: Ratelimit; cvUpload: Ratelimit } | null = null;

function getRatelimiters() {
  if (ratelimiters) return ratelimiters;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  ratelimiters = {
    applications: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "ratelimit:applications",
    }),
    cvUpload: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "ratelimit:cv-upload",
    }),
  };
  return ratelimiters;
}

/**
 * Upstash-backed rate limiting for the guest-facing application/CV-upload
 * endpoints, keyed by client IP. Fails open (allows the request) if Upstash
 * isn't configured, so local development without Upstash credentials still
 * works — but logs loudly so a missing production config isn't silent.
 */
export async function checkRateLimit(kind: "applications" | "cvUpload", identifier: string): Promise<boolean> {
  const limiters = getRatelimiters();
  if (!limiters) {
    console.error("Upstash rate limiting is not configured; allowing request without a limit");
    return true;
  }

  const { success } = await limiters[kind].limit(identifier);
  return success;
}

/**
 * Vercel's edge network sets `x-real-ip` itself (not client-settable) and
 * appends the real client IP as the *last* hop of `x-forwarded-for` — the
 * first entry of that header is whatever the client sent and is trivially
 * spoofable to reset one's own rate-limit bucket, so it must never be used.
 */
export function getClientIdentifier(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  const hops = forwardedFor?.split(",").map((hop) => hop.trim()).filter(Boolean);
  return hops?.[hops.length - 1] ?? "unknown";
}
