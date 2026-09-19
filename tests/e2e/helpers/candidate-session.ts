import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, rmSync } from "node:fs";

const execFileAsync = promisify(execFile);

export const SESSION_COOKIE_NAME = "session";

const WORKER_PATH = path.resolve(__dirname, "candidate-session-worker.ts");
const TSX_CLI = require.resolve("tsx/cli");
const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * Creates a real, verified Firebase Auth user + matching Prisma `User` row
 * with `role: USER`, and mints a real, valid session cookie for it — same
 * approach as `createAdminE2eSession`, for specs that need an authenticated
 * (but non-admin) candidate session, e.g. the candidate registration wizard.
 */
export async function createVerifiedCandidateE2eSession() {
  const outFile = path.join(os.tmpdir(), `e2e-candidate-session-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  await execFileAsync(process.execPath, [TSX_CLI, WORKER_PATH, "create", outFile], { cwd: REPO_ROOT });
  const { email, sessionCookie, firebaseUid, userId } = JSON.parse(readFileSync(outFile, "utf-8"));
  rmSync(outFile, { force: true });

  return {
    email,
    sessionCookie,
    userId,
    async cleanup() {
      await execFileAsync(process.execPath, [TSX_CLI, WORKER_PATH, "cleanup", firebaseUid, userId], {
        cwd: REPO_ROOT,
      });
    },
  };
}
