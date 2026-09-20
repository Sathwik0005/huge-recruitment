import { z } from "zod";
import { candidateProfileContinueSchema } from "./candidate-profile";
import { candidateProfileStep2ContinueSchema, workReferenceSchema } from "./candidate-profile-step2";
import { candidateProfileStep3BaseShape } from "./candidate-profile-step3";

/**
 * Admin edit schemas for `/admin/candidate-profiles/[userId]`. Each one reuses
 * the exact per-field validators the candidate's own wizard already enforces
 * (regexes, enums, age check) via `.partial()` on the existing "continue"
 * schemas, so an admin can save one field at a time without being forced to
 * supply a complete step. No validation rule is re-implemented here.
 *
 * Step 3 has no "continue" schema (only draft/submit) — its submit schema's
 * `superRefine` enforces cross-field completeness per right-to-work branch,
 * which doesn't belong in a partial admin edit. `candidateProfileStep3BaseShape`
 * is the pre-refinement field shape (every field already independently
 * validated, e.g. exact-8-digit account number), so it's used directly.
 */

export const adminStep1Schema = candidateProfileContinueSchema.omit({ intent: true }).partial();

export const adminStep2Schema = candidateProfileStep2ContinueSchema
  .omit({ intent: true, workReferences: true })
  .partial();

export const adminStep3Schema = z.object(candidateProfileStep3BaseShape).partial();

export const adminWorkReferenceSchema = workReferenceSchema;

export type AdminStep1Input = z.infer<typeof adminStep1Schema>;
export type AdminStep2Input = z.infer<typeof adminStep2Schema>;
export type AdminStep3Input = z.infer<typeof adminStep3Schema>;
export type AdminWorkReferenceInput = z.infer<typeof adminWorkReferenceSchema>;
