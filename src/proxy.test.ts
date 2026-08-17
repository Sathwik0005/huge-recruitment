import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function makeRequest(path: string, cookieValue?: string) {
  const headers: Record<string, string> = {};
  if (cookieValue) headers["cookie"] = `session=${cookieValue}`;
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("proxy (edge middleware) — presence-only cookie check", () => {
  it("allows requests to / through even without a session cookie — / is intentionally public", () => {
    const response = proxy(makeRequest("/"));

    expect(response.status).toBe(200);
  });

  it("redirects unauthenticated requests to /admin (no session cookie) to /login", () => {
    const response = proxy(makeRequest("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("redirects unauthenticated requests to a nested /admin/** path to /login", () => {
    const response = proxy(makeRequest("/admin/jobs"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows requests to /admin through when a session cookie is present, regardless of its validity", () => {
    // Deliberately a garbage/invalid cookie value — proxy only checks presence,
    // never validity (see require-admin-session.ts for real verification).
    const response = proxy(makeRequest("/admin", "not-a-real-session-cookie"));

    expect(response.status).toBe(200);
  });

  it("does not guard other paths such as /login or /register", () => {
    const loginResponse = proxy(makeRequest("/login"));
    const registerResponse = proxy(makeRequest("/register"));

    expect(loginResponse.status).toBe(200);
    expect(registerResponse.status).toBe(200);
  });
});
