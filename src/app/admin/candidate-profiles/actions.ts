"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";

type ActionResult = { success: true } | { success: false; error: string };

const userIdSchema = z.string().min(1);

/**
 * Grants or revokes a submitted candidate's one-time exception to edit their
 * `/profile` wizard again. The candidate's own UI has no self-serve unlock —
 * this is the only way editingUnlockedByAdmin ever becomes true. Re-submitting
 * step 3 clears it back to false automatically (see the step-3 API route), so
 * under normal use an admin never needs to lock it again themselves.
 */
export async function setCandidateEditingUnlocked(userId: string, unlock: boolean): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return { success: false, error: "You do not have permission to perform this action." };
  }

  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) {
    return { success: false, error: "Invalid candidate." };
  }

  try {
    await prisma.candidateProfile.update({
      where: { userId: parsed.data },
      data: { editingUnlockedByAdmin: unlock },
    });
    revalidatePath("/admin/candidate-profiles");
    return { success: true };
  } catch (error) {
    console.error("Failed to update candidate editing-unlock state", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
