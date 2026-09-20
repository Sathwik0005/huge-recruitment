import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, rmSync } from "node:fs";

const execFileAsync = promisify(execFile);

const WORKER_PATH = path.resolve(__dirname, "candidate-profile-session-worker.ts");
const TSX_CLI = require.resolve("tsx/cli");
const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * Seeds a real `User` + fully-populated, "submitted" `CandidateProfile` (all
 * three onboarding steps, one `CandidateWorkReference`) directly via Prisma —
 * the admin-CRUD-detail-page equivalent of `createAdminE2eSession`/
 * `createVerifiedCandidateE2eSession`'s "mint the session server-side, don't
 * drive it through the UI" approach, used here because driving the full
 * 05/06/07 multi-step, file-upload-heavy onboarding wizard through the
 * browser just to get *test data* for this spec's admin page would be slow
 * and would duplicate coverage that belongs to the wizard's own (not yet
 * written) E2E spec, not this one. See candidate-profile-session-worker.ts
 * for exactly what's seeded.
 */
export async function createSeededCandidateProfile() {
  const outFile = path.join(
    os.tmpdir(),
    `e2e-candidate-profile-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  await execFileAsync(process.execPath, [TSX_CLI, WORKER_PATH, "create", outFile], { cwd: REPO_ROOT });
  const { userId, email, firstName, lastName } = JSON.parse(readFileSync(outFile, "utf-8"));
  rmSync(outFile, { force: true });

  return {
    userId,
    email,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    async cleanup() {
      await execFileAsync(process.execPath, [TSX_CLI, WORKER_PATH, "cleanup", userId], { cwd: REPO_ROOT });
    },
  };
}
