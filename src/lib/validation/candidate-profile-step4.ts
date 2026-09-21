import { z } from "zod";

/**
 * Step 4 has no draft variant — unlike Steps 1-3 there is nothing meaningful
 * to partially autosave (a typed name, a chosen date, and an accept
 * checkbox), so this is a single submit-only schema.
 */
export const candidateProfileStep4SubmitSchema = z.object({
  intent: z.literal("submit"),
  declarationFullName: z.string().trim().min(1, "Full name is required."),
  // The candidate's own chosen sign-off date — becomes declarationAcceptedAt
  // directly (not a server-stamped "now"), so a future date is rejected here
  // as a second line of defense behind the client's <input type="date" max>.
  declarationDate: z
    .string()
    .trim()
    .min(1, "Date is required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Please enter a valid date.")
    // A day of slack absorbs timezone offsets between the candidate's local
    // "today" (used to build the value) and this server's UTC clock, so a
    // real "today" pick is never rejected purely because of timezone math.
    .refine((value) => new Date(value).getTime() <= Date.now() + 24 * 60 * 60 * 1000, "Date cannot be in the future."),
  // Not persisted as its own column — a request-shape gate only.
  declarationAccepted: z.literal(true, { message: "You must confirm the declaration before submitting." }),
});

export type CandidateProfileStep4SubmitInput = z.infer<typeof candidateProfileStep4SubmitSchema>;

export function parseCandidateProfileStep4Input(body: unknown) {
  return candidateProfileStep4SubmitSchema.safeParse(body);
}
