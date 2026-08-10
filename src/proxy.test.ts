import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function makeRequest(path: string, cookieValue?: string) {
  const headers: Record<string, string> = {};
  if (cookieValue) headers["cookie"] = `session=${cookieValue}`;
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("proxy (edge middleware) — presence-only cookie check", () => {
  it("redirects unauthenticated requests to / (no session cookie) to /login", () => {
    const response = proxy(makeRequest("/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows requests to / through when a session cookie is present, regardless of its validity", () => {
    // Deliberately a garbage/invalid cookie value — proxy only checks presence,
    // never validity (see require-verified-session.ts / route handlers for real verification).
    const response = proxy(makeRequest("/", "not-a-real-session-cookie"));

    expect(response.status).toBe(200);
  });

  it("does not guard other paths such as /login or /register (only / is in PROTECTED_PATHS)", () => {
    const loginResponse = proxy(makeRequest("/login"));
    const registerResponse = proxy(makeRequest("/register"));

    expect(loginResponse.status).toBe(200);
    expect(registerResponse.status).toBe(200);
  });
});
