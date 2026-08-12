"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";
import { JobStatus } from "@/generated/prisma/enums";

type ToggleSectorResult =
  | { success: true; isActive: boolean }
  | { success: false; error: string; activeJobCount?: number };

/**
 * Toggles a sector's active flag. A sector is never deleted — deactivation
 * is the only "removal" path, and is always allowed even when jobs still
 * reference the sector (existing jobs keep working; the sector just drops
 * out of the "create job" picker). The active-job count is returned so the
 * caller can show a confirmation warning before committing to a deactivation
 * that affects live jobs.
 */
export async function toggleSectorActive(sectorId: string, nextIsActive: boolean): Promise<ToggleSectorResult> {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return { success: false, error: "You do not have permission to perform this action." };
  }

  try {
    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    if (!sector) return { success: false, error: "Sector not found." };

    if (!nextIsActive) {
      const activeJobCount = await prisma.job.count({
        where: { sectorId, status: { not: JobStatus.ARCHIVED } },
      });
      if (activeJobCount > 0) {
        // Not a hard block — deactivation is still allowed. The caller
        // surfaces `activeJobCount` in a confirmation prompt before retrying.
        return { success: false, error: "jobs-reference-sector", activeJobCount };
      }
    }

    await prisma.sector.update({ where: { id: sectorId }, data: { isActive: nextIsActive } });
    revalidatePath("/admin/sectors");
    return { success: true, isActive: nextIsActive };
  } catch (error) {
    console.error("Failed to toggle sector active state", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** Second call after the confirmation prompt — deactivates unconditionally. */
export async function forceDeactivateSector(sectorId: string): Promise<ToggleSectorResult> {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return { success: false, error: "You do not have permission to perform this action." };
  }

  try {
    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    if (!sector) return { success: false, error: "Sector not found." };

    await prisma.sector.update({ where: { id: sectorId }, data: { isActive: false } });
    revalidatePath("/admin/sectors");
    return { success: true, isActive: false };
  } catch (error) {
    console.error("Failed to deactivate sector", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
