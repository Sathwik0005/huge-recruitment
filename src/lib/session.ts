import "server-only";
import { cookies } from "next/headers";
import { verifySessionCookie } from "@/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 5;

export async function setSessionCookie(sessionCookie: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    return await verifySessionCookie(sessionCookie);
  } catch {
    return null;
  }
}
