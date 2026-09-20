import { z } from "zod";

/**
 * Step 4 has no draft variant — unlike Steps 1-3 there is nothing meaningful
 * to partially autosave (a typed name and an accept checkbox), so this is a
 * single submit-only schema.
 */
export const candidateProfileStep4SubmitSchema = z.object({
  intent: z.literal("submit"),
  declarationFullName: z.string().trim().min(1, "Full name is required."),
  // Not persisted as its own column — a request-shape gate only. The server
  // derives declarationAcceptedAt from the current time on submit.
  declarationAccepted: z.literal(true, { message: "You must confirm the declaration before submitting." }),
});

export type CandidateProfileStep4SubmitInput = z.infer<typeof candidateProfileStep4SubmitSchema>;

export function parseCandidateProfileStep4Input(body: unknown) {
  return candidateProfileStep4SubmitSchema.safeParse(body);
}
