import "server-only";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

type RequireVerifiedSessionResult =
  | { status: "unauthenticated" }
  | { status: "unverified" }
  | { status: "no-db-user" }
  | { status: "ok"; user: User };

/**
 * Non-redirecting session+identity check for any authenticated (non-admin)
 * candidate route. Mirrors `require-admin-session.ts` minus the role/status
 * checks; callers branch on `.status` and call `redirect()` themselves.
 */
export async function requireVerifiedSession(): Promise<RequireVerifiedSessionResult> {
  const session = await getSession();
  if (!session) return { status: "unauthenticated" };

  if (!session.email_verified) return { status: "unverified" };

  const user = await prisma.user.findUnique({ where: { firebaseUid: session.uid } });
  if (!user) return { status: "no-db-user" };

  return { status: "ok", user };
}
