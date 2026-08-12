import "server-only";
import { prisma } from "@/lib/prisma";

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Generates a unique, URL-safe slug from a job title, resolving collisions
 * deterministically ("title", "title-2", "title-3", ...). Archived jobs still
 * occupy their slug (the `slug` column is never cleared on archive), so this
 * checks against every job regardless of status — never excludes ARCHIVED.
 */
export async function generateJobSlug(title: string, excludeJobId?: string): Promise<string> {
  const base = slugify(title) || "job";

  const existing = await prisma.job.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeJobId ? { id: { not: excludeJobId } } : {}),
    },
    select: { slug: true },
  });

  if (existing.length === 0) return base;

  const taken = new Set(existing.map((job) => job.slug));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
