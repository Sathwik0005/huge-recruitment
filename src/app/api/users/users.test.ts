import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/firebase/admin", () => ({
  verifyIdToken: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { verifyIdToken, deleteUser } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { POST } from "./route";

const mockVerifyIdToken = vi.mocked(verifyIdToken);
const mockDeleteUser = vi.mocked(deleteUser);
const mockCreate = vi.mocked(prisma.user.create);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeMalformedRequest() {
  return new Request("http://localhost/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/users", () => {
  it("creates a User row and returns 201 for a valid request with a valid idToken", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
    const createdUser = { id: "1", firebaseUid: "uid-1", firstName: "Ann", lastName: "Lee", email: "a@b.com" };
    mockCreate.mockResolvedValue(createdUser as never);

    const response = await POST(makeRequest({ idToken: "token", firstName: "Ann", lastName: "Lee" }));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({ user: createdUser });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { firebaseUid: "uid-1", firstName: "Ann", lastName: "Lee", email: "a@b.com" },
    });
  });

  it("derives firebaseUid and email from the verified token, never from the request body", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "server-verified-uid", email: "server@verified.com" } as never);
    mockCreate.mockResolvedValue({ id: "1" } as never);

    // Client attempts to smuggle a different uid/email — must be ignored.
    await POST(
      makeRequest({
        idToken: "token",
        firstName: "Ann",
        lastName: "Lee",
        firebaseUid: "client-supplied-uid",
        email: "attacker@evil.com",
      }),
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: { firebaseUid: "server-verified-uid", firstName: "Ann", lastName: "Lee", email: "server@verified.com" },
    });
  });

  it.each([
    [{ firstName: "Ann", lastName: "Lee" }, "missing idToken"],
    [{ idToken: "token", lastName: "Lee" }, "missing firstName"],
    [{ idToken: "token", firstName: "Ann" }, "missing lastName"],
    [{}, "missing everything"],
  ])("returns 400 for %o (%s), without calling verifyIdToken", async (body) => {
    const response = await POST(makeRequest(body));

    expect(response.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    const response = await POST(makeMalformedRequest());
    expect(response.status).toBe(400);
  });

  it("returns 401 when the idToken fails verification", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("invalid token"));

    const response = await POST(makeRequest({ idToken: "bad", firstName: "Ann", lastName: "Lee" }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not set a session cookie on successful registration (no auto-login)", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
    mockCreate.mockResolvedValue({ id: "1" } as never);

    const response = await POST(makeRequest({ idToken: "token", firstName: "Ann", lastName: "Lee" }));

    expect(response.headers.get("set-cookie")).toBeNull();
  });

  describe("guarded compensating rollback on Prisma create failure", () => {
    it("idempotent retry: re-query finds an existing User -> returns 200 with existing user, never deletes the Firebase account", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
      const existing = { id: "1", firebaseUid: "uid-1", firstName: "Ann", lastName: "Lee", email: "a@b.com" };
      mockCreate.mockRejectedValue(new Error("some create failure"));
      mockFindUnique.mockResolvedValue(existing as never);

      const response = await POST(makeRequest({ idToken: "token", firstName: "Ann", lastName: "Lee" }));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ user: existing });
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { firebaseUid: "uid-1" } });
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it("confirmed orphan + P2002 -> deletes the Firebase account and returns 409", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
      const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "0.0.0",
      });
      mockCreate.mockRejectedValue(p2002);
      mockFindUnique.mockResolvedValue(null);
      mockDeleteUser.mockResolvedValue(undefined as never);

      const response = await POST(makeRequest({ idToken: "token", firstName: "Ann", lastName: "Lee" }));
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.error).toBeTruthy();
      expect(mockDeleteUser).toHaveBeenCalledWith("uid-1");
    });

    it("confirmed orphan + non-P2002 error -> deletes the Firebase account and returns 500", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
      mockCreate.mockRejectedValue(new Error("unexpected db failure"));
      mockFindUnique.mockResolvedValue(null);
      mockDeleteUser.mockResolvedValue(undefined as never);

      const response = await POST(makeRequest({ idToken: "token", firstName: "Ann", lastName: "Lee" }));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBeTruthy();
      expect(mockDeleteUser).toHaveBeenCalledWith("uid-1");
    });

    it("indeterminate ground truth (re-query itself throws) -> never deletes, returns 500", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
      mockCreate.mockRejectedValue(new Error("create failed"));
      mockFindUnique.mockRejectedValue(new Error("db unreachable"));

      const response = await POST(makeRequest({ idToken: "token", firstName: "Ann", lastName: "Lee" }));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBeTruthy();
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });
});
