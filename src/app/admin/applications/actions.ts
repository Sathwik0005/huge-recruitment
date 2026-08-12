"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";
import { ApplicationStatus } from "@/generated/prisma/enums";

type ActionResult = { success: true } | { success: false; error: string };

const statusSchema = z.enum(ApplicationStatus);

export async function updateApplicationStatus(
  applicationId: string,
  rawStatus: ApplicationStatus
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return { success: false, error: "You do not have permission to perform this action." };
  }

  const parsed = statusSchema.safeParse(rawStatus);
  if (!parsed.success) {
    return { success: false, error: "Invalid application status." };
  }
  const status = parsed.data;

  try {
    await prisma.jobApplication.update({ where: { id: applicationId }, data: { status } });
    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${applicationId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update application status", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
