import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/firebase/admin", () => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mint-session", () => ({
  mintSession: vi.fn(),
}));

vi.mock("@/lib/welcome-email", () => ({
  sendWelcomeEmailOnce: vi.fn(),
}));

import { verifyIdToken } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { mintSession } from "@/lib/mint-session";
import { sendWelcomeEmailOnce } from "@/lib/welcome-email";
import { Prisma } from "@/generated/prisma/client";
import { POST } from "./route";

const mockVerifyIdToken = vi.mocked(verifyIdToken);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreate = vi.mocked(prisma.user.create);
const mockMintSession = vi.mocked(mintSession);
const mockSendWelcomeEmailOnce = vi.mocked(sendWelcomeEmailOnce);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMintSession.mockResolvedValue(undefined);
  mockSendWelcomeEmailOnce.mockResolvedValue(undefined);
});

describe("POST /api/auth/login", () => {
  it("returns 400 when idToken is missing", async () => {
    const response = await POST(makeRequest({ provider: "password" }));
    expect(response.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 400 when provider is missing or not one of password/google", async () => {
    const response1 = await POST(makeRequest({ idToken: "token" }));
    expect(response1.status).toBe(400);

    const response2 = await POST(makeRequest({ idToken: "token", provider: "carrier-pigeon" }));
    expect(response2.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", { method: "POST", body: "{bad" }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when the idToken fails verification", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));

    const response = await POST(makeRequest({ idToken: "bad", provider: "password" }));

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("logs in successfully for an existing user with a verified/password token: mints session, returns 200 with user", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: true,
      firebase: { sign_in_provider: "password" },
    } as never);
    const existingUser = { id: "1", firebaseUid: "uid-1", firstName: "Ann", lastName: "Lee", email: "a@b.com" };
    mockFindUnique.mockResolvedValue(existingUser as never);

    const response = await POST(makeRequest({ idToken: "token", provider: "password" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ user: existingUser });
    expect(mockMintSession).toHaveBeenCalledWith("token");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("refuses a session for an unverified password-flow user — email must be verified before a session ever exists", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: false,
      firebase: { sign_in_provider: "password" },
    } as never);
    const existingUser = { id: "1", firebaseUid: "uid-1", firstName: "Ann", lastName: "Lee", email: "a@b.com" };
    mockFindUnique.mockResolvedValue(existingUser as never);

    const response = await POST(makeRequest({ idToken: "token", provider: "password" }));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.code).toBe("email-not-verified");
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("applies the same unverified-blocks-session rule to a NEW password-flow user too (no DB user yet, not Google)", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: false,
      firebase: { sign_in_provider: "password" },
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ idToken: "token", provider: "password" }));

    // Falls through the existing no-DB-user/not-Google 404 branch before
    // ever reaching the verified-email gate — still never mints a session.
    expect(response.status).toBe(404);
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("returns 404 when no DB user exists and the verified token's sign_in_provider is not google.com", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: true,
      firebase: { sign_in_provider: "password" },
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ idToken: "token", provider: "password" }));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("critical security case: client claims provider:'google' in the body but the verified token is a password-flow token -> still 404, no auto-provisioning", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: true,
      firebase: { sign_in_provider: "password" }, // authoritative — NOT google.com
    } as never);
    mockFindUnique.mockResolvedValue(null);

    // Client lies about provider in the request body.
    const response = await POST(makeRequest({ idToken: "token", provider: "google" }));

    expect(response.status).toBe(404);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("auto-provisions a new User when no DB user exists and the verified token's sign_in_provider IS google.com with email_verified true", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: true,
      name: "Jane Doe",
      firebase: { sign_in_provider: "google.com" },
    } as never);
    mockFindUnique.mockResolvedValue(null);
    const createdUser = { id: "1", firebaseUid: "uid-1", firstName: "Jane", lastName: "Doe", email: "a@b.com" };
    mockCreate.mockResolvedValue(createdUser as never);

    const response = await POST(makeRequest({ idToken: "token", provider: "google" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ user: createdUser });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { firebaseUid: "uid-1", firstName: "Jane", lastName: "Doe", email: "a@b.com" },
    });
    expect(mockMintSession).toHaveBeenCalledWith("token");
    expect(mockSendWelcomeEmailOnce).toHaveBeenCalledWith(createdUser);
    // Welcome email is sent before the session is minted, so a slow/failed
    // send can never block or race the actual sign-in.
    expect(mockSendWelcomeEmailOnce.mock.invocationCallOrder[0]).toBeLessThan(
      mockMintSession.mock.invocationCallOrder[0],
    );
  });

  it("does not send a welcome email for an existing (non-newly-created) Google user", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    } as never);
    const existingUser = { id: "1", firebaseUid: "uid-1", firstName: "Ann", lastName: "Lee", email: "a@b.com" };
    mockFindUnique.mockResolvedValue(existingUser as never);

    const response = await POST(makeRequest({ idToken: "token", provider: "google" }));

    expect(response.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSendWelcomeEmailOnce).not.toHaveBeenCalled();
  });

  it("does NOT auto-provision when sign_in_provider is google.com but email_verified is false", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: false,
      name: "Jane Doe",
      firebase: { sign_in_provider: "google.com" },
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ idToken: "token", provider: "google" }));

    expect(response.status).toBe(404);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Google auto-provisioning: raced unique-constraint violation (P2002) maps to 409, not a leaked 500", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-1",
      email: "a@b.com",
      email_verified: true,
      name: "Jane Doe",
      firebase: { sign_in_provider: "google.com" },
    } as never);
    mockFindUnique.mockResolvedValue(null);
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "0.0.0",
    });
    mockCreate.mockRejectedValue(p2002);

    const response = await POST(makeRequest({ idToken: "token", provider: "google" }));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBeTruthy();
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("does not query/scope by any client-supplied uid — only the verified token's uid is used", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "server-verified-uid",
      email: "a@b.com",
      email_verified: true,
      firebase: { sign_in_provider: "password" },
    } as never);
    mockFindUnique.mockResolvedValue({ id: "1" } as never);

    await POST(
      makeRequest({ idToken: "token", provider: "password", firebaseUid: "client-supplied-uid" }),
    );

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { firebaseUid: "server-verified-uid" } });
  });
});
