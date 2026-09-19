import { z } from "zod";

const hoursAvailabilityValues = ["ZERO_TO_TEN", "TEN_TO_TWENTY", "TWENTY_TO_THIRTY", "THIRTY_PLUS"] as const;
const transportModeValues = ["CAR", "BUS", "TAXI", "CYCLE", "WALK", "TRAIN"] as const;
const relationshipValues = ["SPOUSE_PARTNER", "RELATIVE_FAMILY", "FRIEND", "OTHER"] as const;
const referralSourceValues = [
  "INDEED_JOB_BOARD",
  "GOOGLE_SEARCH",
  "SOCIAL_MEDIA",
  "FRIEND_COLLEAGUE_REFERRAL",
  "JOBCENTRE_PLUS",
  "OTHER",
] as const;
const availabilityToStartValues = ["IMMEDIATE", "NEXT_WEEK", "TWO_TO_THREE_WEEKS", "FOUR_WEEKS_PLUS"] as const;
// Reuses the jobs platform's existing sector taxonomy (see `Sector`/`SectorName`
// in prisma/schema.prisma) rather than inventing a parallel enum for the same
// five categories.
const sectorNameValues = ["PRODUCTION", "WAREHOUSING", "MANUFACTURING", "DISTRIBUTION", "AUTOMOTIVE"] as const;

const MIN_SHOE_SIZE = 3;
const MAX_SHOE_SIZE = 16;
// Same "national significant number, no leading 0" 10-digit shape as the
// candidate's own mobile number in candidate-profile.ts.
const MOBILE_NUMBER_REGEX = /^\d{10}$/;

const monthDateSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Please enter a valid date.")
  .transform((value) => new Date(value));

// Treats an empty string the same as an absent value — the client always sends
// `endDate` as a string (possibly "") rather than omitting the key.
const optionalMonthDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), "Please enter a valid date.")
  .transform((value) => (value === undefined ? undefined : new Date(value)));

const workReferenceBaseSchema = z.object({
  jobTitle: z.string().trim().min(1, "Job title is required.").max(150),
  companyName: z.string().trim().min(1, "Company name is required.").max(150),
  companyAddress: z.string().trim().max(300).optional(),
  startDate: monthDateSchema,
  endDate: optionalMonthDateSchema,
  isCurrentJob: z.boolean().default(false),
  managerName: z.string().trim().max(150).optional(),
  managerMobile: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => value === undefined || MOBILE_NUMBER_REGEX.test(value), "Manager mobile must be exactly 10 digits."),
  managerEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => value === undefined || z.string().email().safeParse(value).success, "Please enter a valid email."),
});

const workReferenceSchema = workReferenceBaseSchema.superRefine((value, ctx) => {
  if (value.isCurrentJob) {
    if (value.endDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be empty for your current role." });
    }
    return;
  }
  if (!value.endDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date is required unless this is your current role." });
  }
});

export const candidateProfileStep2ContinueSchema = z.object({
  intent: z.literal("continue"),
  preferredWorkLocation: z.string().trim().min(1, "Please tell us where you're looking for work.").max(150),
  hoursAvailability: z.enum(hoursAvailabilityValues, { message: "Please select how many hours you need." }),
  availabilityToStart: z.enum(availabilityToStartValues, { message: "Please select when you're available to start." }),
  interestedSectors: z.array(z.enum(sectorNameValues)).min(1, "Please select at least one role you're interested in."),
  transportMode: z.enum(transportModeValues, { message: "Please select how you'll travel to work." }),
  shoeSize: z
    .number({ message: "Please select your shoe size." })
    .min(MIN_SHOE_SIZE, `Shoe size must be at least ${MIN_SHOE_SIZE}.`)
    .max(MAX_SHOE_SIZE, `Shoe size must be at most ${MAX_SHOE_SIZE}.`)
    .refine((value) => Number.isInteger(value * 2), "Shoe size must be in 0.5 increments."),
  emergencyContactName: z.string().trim().min(1, "Emergency contact name is required.").max(150),
  emergencyContactMobile: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => MOBILE_NUMBER_REGEX.test(value), "Emergency contact mobile must be exactly 10 digits."),
  emergencyContactRelationship: z.enum(relationshipValues, { message: "Please select a relationship." }),
  referralSource: z.enum(referralSourceValues).optional(),
  workReferences: z.array(workReferenceSchema).optional(),
});

export const candidateProfileStep2DraftSchema = z.object({
  intent: z.literal("draft"),
  preferredWorkLocation: z.string().trim().max(150).optional(),
  hoursAvailability: z.enum(hoursAvailabilityValues).optional(),
  availabilityToStart: z.enum(availabilityToStartValues).optional(),
  interestedSectors: z.array(z.enum(sectorNameValues)).optional(),
  transportMode: z.enum(transportModeValues).optional(),
  shoeSize: z
    .number()
    .min(MIN_SHOE_SIZE)
    .max(MAX_SHOE_SIZE)
    .refine((value) => Number.isInteger(value * 2), "Shoe size must be in 0.5 increments.")
    .optional(),
  emergencyContactName: z.string().trim().max(150).optional(),
  emergencyContactMobile: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length <= 10, "Emergency contact mobile must be at most 10 digits.")
    .optional(),
  emergencyContactRelationship: z.enum(relationshipValues).optional(),
  referralSource: z.enum(referralSourceValues).optional(),
  workReferences: z.array(workReferenceSchema).optional(),
});

export type CandidateProfileStep2ContinueInput = z.infer<typeof candidateProfileStep2ContinueSchema>;
export type CandidateProfileStep2DraftInput = z.infer<typeof candidateProfileStep2DraftSchema>;

const intentSchema = z.object({ intent: z.enum(["draft", "continue"]) });

/** Picks the draft or continue schema based on the payload's own `intent` field, then parses against it. */
export function parseCandidateProfileStep2Input(body: unknown) {
  const intentResult = intentSchema.safeParse(body);
  if (!intentResult.success) {
    return intentResult;
  }
  return intentResult.data.intent === "continue"
    ? candidateProfileStep2ContinueSchema.safeParse(body)
    : candidateProfileStep2DraftSchema.safeParse(body);
}
