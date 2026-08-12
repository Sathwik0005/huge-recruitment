import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, rmSync } from "node:fs";

const execFileAsync = promisify(execFile);

export const SESSION_COOKIE_NAME = "session";

const WORKER_PATH = path.resolve(__dirname, "admin-session-worker.ts");
const TSX_CLI = require.resolve("tsx/cli");
const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * Creates a real, verified Firebase Auth user + matching Prisma `User` row
 * with `role: ADMIN`, and mints a real, valid session cookie for it —
 * entirely server-side (custom token -> REST exchange -> session cookie),
 * without needing a real inbox or browser sign-in. Runs in a `tsx` child
 * process (see admin-session-worker.ts) because Playwright's own TS
 * transform cannot load the generated Prisma client directly. Communicates
 * via a temp file rather than stdout since `tsx` writes its own diagnostics
 * to stdout too.
 */
export async function createAdminE2eSession() {
  const outFile = path.join(os.tmpdir(), `e2e-admin-session-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  await execFileAsync(process.execPath, [TSX_CLI, WORKER_PATH, "create", outFile], { cwd: REPO_ROOT });
  const { email, sessionCookie, firebaseUid, userId } = JSON.parse(readFileSync(outFile, "utf-8"));
  rmSync(outFile, { force: true });

  return {
    email,
    sessionCookie,
    async cleanup() {
      await execFileAsync(process.execPath, [TSX_CLI, WORKER_PATH, "cleanup", firebaseUid, userId], {
        cwd: REPO_ROOT,
      });
    },
  };
}
