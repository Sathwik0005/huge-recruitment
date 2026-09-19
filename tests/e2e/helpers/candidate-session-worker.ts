/**
 * Runs under `tsx` (real Node ESM, via child_process from candidate-session.ts)
 * — same reasoning as admin-session-worker.ts. Creates a verified, non-admin
 * `USER` for e2e specs that need an authenticated candidate session.
 */
import path from "node:path";
import { writeFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../../.env.local") });

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

function getAdminApp() {
  return getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
}

async function create(outFile: string) {
  const { prisma } = await import("../../../src/lib/prisma");
  const auth = getAuth(getAdminApp());
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `e2e+candidate-${runId}@example.test`;

  const firebaseUser = await auth.createUser({ email, emailVerified: true, password: "Str0ng!Passw0rd" });

  const user = await prisma.user.create({
    data: {
      firebaseUid: firebaseUser.uid,
      firstName: "E2E",
      lastName: "Candidate",
      email,
      role: "USER",
      status: "ACTIVE",
    },
  });

  const customToken = await auth.createCustomToken(firebaseUser.uid);

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const exchangeResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const exchangeData = await exchangeResponse.json();
  if (!exchangeResponse.ok) {
    throw new Error(`Failed to exchange custom token for an ID token: ${JSON.stringify(exchangeData)}`);
  }

  const sessionCookie = await auth.createSessionCookie(exchangeData.idToken, { expiresIn: SESSION_MAX_AGE_MS });

  writeFileSync(
    outFile,
    JSON.stringify({ email, sessionCookie, firebaseUid: firebaseUser.uid, userId: user.id })
  );
}

async function cleanup(firebaseUid: string, userId: string) {
  const { prisma } = await import("../../../src/lib/prisma");
  const auth = getAuth(getAdminApp());
  await Promise.allSettled([
    auth.deleteUser(firebaseUid),
    prisma.candidateProfile.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}

const [, , mode, arg1, arg2] = process.argv;

(async () => {
  if (mode === "create") {
    await create(arg1);
  } else if (mode === "cleanup") {
    await cleanup(arg1, arg2);
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
  const { prisma } = await import("../../../src/lib/prisma");
  await prisma.$disconnect();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
