"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";

type ActionResult<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

const nameSchema = z.string().trim().min(1, "Employer name is required.").max(150);

/**
 * Minimal `Client` (employer) CRUD — spec 04-admin-panel decision 13. No
 * hard delete: `Job.clientId` is `onDelete: SetNull`, so deactivating a
 * client never orphans a job, unlike `Sector` which needs the active-job
 * warning in sectors/actions.ts.
 */
export async function createClient(name: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return { success: false, error: "You do not have permission to perform this action." };
  }

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid employer name." };
  }

  try {
    const client = await prisma.client.create({ data: { name: parsed.data } });
    revalidatePath("/admin/clients");
    return { success: true, data: { id: client.id } };
  } catch (error) {
    console.error("Failed to create client", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function toggleClientActive(clientId: string, nextIsActive: boolean): Promise<ActionResult<{ isActive: boolean }>> {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return { success: false, error: "You do not have permission to perform this action." };
  }

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Employer not found." };

    await prisma.client.update({ where: { id: clientId }, data: { isActive: nextIsActive } });
    revalidatePath("/admin/clients");
    return { success: true, data: { isActive: nextIsActive } };
  } catch (error) {
    console.error("Failed to toggle client active state", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
