import "server-only";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });

const adminAuth = getAuth(app);

export function verifyIdToken(idToken: string) {
  return adminAuth.verifyIdToken(idToken);
}

export function createSessionCookie(idToken: string, expiresIn: number) {
  return adminAuth.createSessionCookie(idToken, { expiresIn });
}

export function verifySessionCookie(sessionCookie: string) {
  return adminAuth.verifySessionCookie(sessionCookie, true);
}

export function deleteUser(uid: string) {
  return adminAuth.deleteUser(uid);
}
