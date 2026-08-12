import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { generateJobSlug } from "./job-slug";

const mockFindMany = vi.mocked(prisma.job.findMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateJobSlug", () => {
  it("returns the base slug when no collisions exist", async () => {
    mockFindMany.mockResolvedValue([]);
    await expect(generateJobSlug("Warehouse Operative")).resolves.toBe("warehouse-operative");
  });

  it("appends -2 when the base slug is already taken", async () => {
    mockFindMany.mockResolvedValue([{ slug: "warehouse-operative" }] as never);
    await expect(generateJobSlug("Warehouse Operative")).resolves.toBe("warehouse-operative-2");
  });

  it("finds the next free suffix when multiple collisions exist", async () => {
    mockFindMany.mockResolvedValue([
      { slug: "warehouse-operative" },
      { slug: "warehouse-operative-2" },
      { slug: "warehouse-operative-3" },
    ] as never);
    await expect(generateJobSlug("Warehouse Operative")).resolves.toBe("warehouse-operative-4");
  });

  it("checks against every job regardless of status (archived slugs stay reserved)", async () => {
    mockFindMany.mockResolvedValue([]);
    await generateJobSlug("Warehouse Operative");

    const whereArg = mockFindMany.mock.calls[0][0]?.where;
    expect(whereArg).not.toHaveProperty("status");
  });

  it("excludes the job's own id when regenerating a slug on update", async () => {
    mockFindMany.mockResolvedValue([]);
    await generateJobSlug("Warehouse Operative", "job-123");

    const whereArg = mockFindMany.mock.calls[0][0]?.where as { id?: { not: string } };
    expect(whereArg.id).toEqual({ not: "job-123" });
  });

  it("produces a URL-safe slug from a title with punctuation", async () => {
    mockFindMany.mockResolvedValue([]);
    await expect(generateJobSlug("Quality Inspector (Nights)!")).resolves.toBe("quality-inspector-nights");
  });
});
