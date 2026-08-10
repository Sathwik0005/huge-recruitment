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
 * Non-redirecting session+identity check for the protected `/` route.
 *
 * Note: `email_verified` is baked into the session cookie at mint time, so a
 * user who verifies their email after an existing session cookie was minted
 * will still read as "unverified" here until a fresh cookie is minted (see
 * /api/auth/session, called from /verify-email's success handler, which
 * re-mints the cookie the moment verification is confirmed).
 */
export async function requireVerifiedSession(): Promise<RequireVerifiedSessionResult> {
  const session = await getSession();
  if (!session) return { status: "unauthenticated" };

  if (!session.email_verified) return { status: "unverified" };

  const user = await prisma.user.findUnique({ where: { firebaseUid: session.uid } });
  if (!user) return { status: "no-db-user" };

  return { status: "ok", user };
}
