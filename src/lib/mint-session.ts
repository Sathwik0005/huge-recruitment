import "server-only";
import { createSessionCookie } from "@/firebase/admin";
import { setSessionCookie, SESSION_MAX_AGE } from "@/lib/session";

export async function mintSession(idToken: string) {
  // Firebase Admin SDK's createSessionCookie expects `expiresIn` in milliseconds,
  // while the cookie's own `maxAge` (in session.ts) is in seconds. Convert here.
  const sessionCookie = await createSessionCookie(idToken, SESSION_MAX_AGE * 1000);
  await setSessionCookie(sessionCookie);
}
