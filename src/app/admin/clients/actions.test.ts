import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient, toggleClientActive } from "./actions";

const mockRequireAdminSession = vi.mocked(requireAdminSession);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockClientCreate = vi.mocked(prisma.client.create);
const mockClientFindUnique = vi.mocked(prisma.client.findUnique);
const mockClientUpdate = vi.mocked(prisma.client.update);

const ADMIN_USER = { id: "admin-1", role: "ADMIN", status: "ACTIVE" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createClient", () => {
  it("short-circuits when the caller is unauthenticated, without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const result = await createClient("Acme Logistics");

    expect(result.success).toBe(false);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it("short-circuits when the caller is a non-admin (forbidden), without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    const result = await createClient("Acme Logistics");

    expect(result.success).toBe(false);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty name without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await createClient("");

    expect(result.success).toBe(false);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only name without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await createClient("   ");

    expect(result.success).toBe(false);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it("rejects a name exceeding the max length without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await createClient("A".repeat(151));

    expect(result.success).toBe(false);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it("creates a client with the trimmed name on the happy path and revalidates the clients page", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockClientCreate.mockResolvedValue({ id: "client-1", name: "Acme Logistics" } as never);

    const result = await createClient("  Acme Logistics  ");

    expect(result).toEqual({ success: true, data: { id: "client-1" } });
    expect(mockClientCreate).toHaveBeenCalledWith({ data: { name: "Acme Logistics" } });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/clients");
  });

  it("returns a generic error and does not leak the raw exception when Prisma throws", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockClientCreate.mockRejectedValue(new Error("connection reset"));

    const result = await createClient("Acme Logistics");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain("connection reset");
    }
  });
});

describe("toggleClientActive", () => {
  it("short-circuits when the caller is unauthenticated, without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const result = await toggleClientActive("client-1", false);

    expect(result.success).toBe(false);
    expect(mockClientFindUnique).not.toHaveBeenCalled();
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });

  it("short-circuits when the caller is a non-admin (forbidden), without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    const result = await toggleClientActive("client-1", false);

    expect(result.success).toBe(false);
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });

  it("returns an error when the client does not exist", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockClientFindUnique.mockResolvedValue(null);

    const result = await toggleClientActive("missing-client", false);

    expect(result.success).toBe(false);
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });

  it("deactivates a client with NO active-job-count guard (unlike toggleSectorActive)", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockClientFindUnique.mockResolvedValue({ id: "client-1", isActive: true } as never);

    const result = await toggleClientActive("client-1", false);

    expect(result).toEqual({ success: true, data: { isActive: false } });
    expect(mockClientUpdate).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { isActive: false },
    });
  });

  it("activates a client and revalidates the clients page", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockClientFindUnique.mockResolvedValue({ id: "client-1", isActive: false } as never);

    const result = await toggleClientActive("client-1", true);

    expect(result).toEqual({ success: true, data: { isActive: true } });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/clients");
  });

  it("returns a generic error and does not leak the raw exception when Prisma throws", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockClientFindUnique.mockResolvedValue({ id: "client-1", isActive: true } as never);
    mockClientUpdate.mockRejectedValue(new Error("connection reset"));

    const result = await toggleClientActive("client-1", false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain("connection reset");
    }
  });
});
