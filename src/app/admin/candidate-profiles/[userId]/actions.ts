"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";
import {
  adminStep1Schema,
  adminStep2Schema,
  adminStep3Schema,
  adminWorkReferenceSchema,
} from "@/lib/validation/admin-candidate-profile";
import { getSignedDocumentUrl } from "@/lib/candidate-documents";
import type { DocumentSlot } from "@/lib/candidate-documents";

type ActionResult<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

const userIdSchema = z.string().min(1);

function detailPath(userId: string) {
  return `/admin/candidate-profiles/${userId}`;
}

async function checkAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return { ok: false, error: "You do not have permission to perform this action." };
  }
  return { ok: true };
}

/** Saves Step 1 (personal + contact + address) fields, one or all at once. */
export async function updateCandidateStep1(userId: string, values: unknown): Promise<ActionResult> {
  const admin = await checkAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return { success: false, error: "Invalid candidate." };

  const parsed = adminStep1Schema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await prisma.candidateProfile.update({ where: { userId: parsedUserId.data }, data: parsed.data });
    revalidatePath(detailPath(parsedUserId.data));
    return { success: true };
  } catch (error) {
    console.error("Failed to update candidate Step 1 fields", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** Saves Step 2's non-repeatable fields (work references are handled separately). */
export async function updateCandidateStep2(userId: string, values: unknown): Promise<ActionResult> {
  const admin = await checkAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return { success: false, error: "Invalid candidate." };

  const parsed = adminStep2Schema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await prisma.candidateProfile.update({ where: { userId: parsedUserId.data }, data: parsed.data });
    revalidatePath(detailPath(parsedUserId.data));
    return { success: true };
  } catch (error) {
    console.error("Failed to update candidate Step 2 fields", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** Saves Step 3 (right-to-work + bank details) fields. */
export async function updateCandidateStep3(userId: string, values: unknown): Promise<ActionResult> {
  const admin = await checkAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return { success: false, error: "Invalid candidate." };

  const parsed = adminStep3Schema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await prisma.candidateProfile.update({ where: { userId: parsedUserId.data }, data: parsed.data });
    revalidatePath(detailPath(parsedUserId.data));
    return { success: true };
  } catch (error) {
    console.error("Failed to update candidate Step 3 fields", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Replaces the candidate's full set of work references in one transaction —
 * same delete-and-recreate shape as the candidate-facing step-2 API route.
 */
export async function updateCandidateWorkReferences(userId: string, references: unknown[]): Promise<ActionResult> {
  const admin = await checkAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return { success: false, error: "Invalid candidate." };

  const parsedReferences: z.infer<typeof adminWorkReferenceSchema>[] = [];
  for (const reference of references) {
    const parsed = adminWorkReferenceSchema.safeParse(reference);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid work reference." };
    }
    parsedReferences.push(parsed.data);
  }

  try {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: parsedUserId.data } });
    if (!profile) {
      return { success: false, error: "This candidate has no profile." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.candidateWorkReference.deleteMany({ where: { candidateProfileId: profile.id } });
      if (parsedReferences.length > 0) {
        await tx.candidateWorkReference.createMany({
          data: parsedReferences.map((reference, index) => ({
            ...reference,
            candidateProfileId: profile.id,
            displayOrder: index,
          })),
        });
      }
    });

    revalidatePath(detailPath(parsedUserId.data));
    return { success: true };
  } catch (error) {
    console.error("Failed to update candidate work references", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** Generates a fresh short-lived signed URL for a Step 3 document slot, on demand. */
export async function getDocumentViewUrl(
  userId: string,
  slot: DocumentSlot,
): Promise<ActionResult<{ url: string }>> {
  const admin = await checkAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return { success: false, error: "Invalid candidate." };

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: parsedUserId.data } });
  if (!profile) return { success: false, error: "This candidate has no profile." };

  const keyColumn =
    slot === "rightToWorkFront"
      ? profile.rightToWorkDocFrontS3Key
      : slot === "rightToWorkBack"
        ? profile.rightToWorkDocBackS3Key
        : profile.bankStatementS3Key;

  if (!keyColumn) return { success: false, error: "No document has been uploaded for this slot." };

  try {
    const url = await getSignedDocumentUrl(keyColumn);
    return { success: true, data: { url } };
  } catch (error) {
    // S3 credentials only resolve in Vercel Production (see src/lib/s3.ts).
    console.error("Failed to generate signed document URL", error);
    return { success: false, error: "Document preview isn't available in this environment." };
  }
}

/**
 * Clears the candidate's avatar. Database-only — does not delete the
 * underlying S3 object (the S3 role has no `s3:DeleteObject` grant today;
 * see `.claude/specs/08-admin-candidate-profile-crud.md`), matching the
 * existing avatar-replace flow, which already leaves superseded objects
 * orphaned in S3.
 */
export async function clearCandidateAvatar(userId: string): Promise<ActionResult> {
  const admin = await checkAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return { success: false, error: "Invalid candidate." };

  try {
    await prisma.candidateProfile.update({ where: { userId: parsedUserId.data }, data: { avatarS3Key: null } });
    revalidatePath(detailPath(parsedUserId.data));
    return { success: true };
  } catch (error) {
    console.error("Failed to clear candidate avatar", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** Clears one Step 3 document slot's key + filename columns. Database-only, see `clearCandidateAvatar`. */
export async function clearCandidateDocument(userId: string, slot: DocumentSlot): Promise<ActionResult> {
  const admin = await checkAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return { success: false, error: "Invalid candidate." };

  const data =
    slot === "rightToWorkFront"
      ? { rightToWorkDocFrontS3Key: null, rightToWorkDocFrontOriginalFilename: null }
      : slot === "rightToWorkBack"
        ? { rightToWorkDocBackS3Key: null, rightToWorkDocBackOriginalFilename: null }
        : { bankStatementS3Key: null, bankStatementOriginalFilename: null };

  try {
    await prisma.candidateProfile.update({ where: { userId: parsedUserId.data }, data });
    revalidatePath(detailPath(parsedUserId.data));
    return { success: true };
  } catch (error) {
    console.error("Failed to clear candidate document", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
