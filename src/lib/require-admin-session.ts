import "server-only";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

type RequireAdminSessionResult =
  | { status: "unauthenticated" }
  | { status: "unverified" }
  | { status: "no-db-user" }
  | { status: "forbidden" }
  | { status: "ok"; user: User };

/**
 * Non-redirecting session+identity+role check for `/admin/**`. Mirrors
 * `require-verified-session.ts` exactly; callers branch on `.status` and call
 * `redirect()` themselves. `"forbidden"` never reveals whether the admin area
 * exists to a non-admin caller (callers should redirect to `/`, not show a 403).
 */
export async function requireAdminSession(): Promise<RequireAdminSessionResult> {
  const session = await getSession();
  if (!session) return { status: "unauthenticated" };

  if (!session.email_verified) return { status: "unverified" };

  const user = await prisma.user.findUnique({ where: { firebaseUid: session.uid } });
  if (!user) return { status: "no-db-user" };

  if (user.role !== "ADMIN" || user.status !== "ACTIVE") return { status: "forbidden" };

  return { status: "ok", user };
}
