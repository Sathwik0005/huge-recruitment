import { z } from "zod";

// UK NI number: two letters (excluding D,F,I,Q,U,V as either letter, and O as
// the second), six digits, one suffix letter A-D.
const NI_NUMBER_REGEX = /^[A-CEGHJ-PR-TW-Z]{2}[0-9]{6}[A-D]$/;
const DIAL_CODE_REGEX = /^\+[1-9]\d{0,3}$/;
// UK national significant number, i.e. the mobile number with its dial code
// (+44, selected separately) and leading 0 both stripped — exactly 10 digits.
const MOBILE_NUMBER_REGEX = /^\d{10}$/;
// Standard UK postcode shape (outward + inward code), e.g. "S1 2BJ" or "SW1A 1AA".
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;
const MIN_CANDIDATE_AGE = 16;

function calculateAge(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

const titleValues = ["MR", "MRS", "MISS", "MS", "DR", "OTHER"] as const;
const genderValues = ["MALE", "FEMALE", "OTHER"] as const;

const dateOfBirthSchema = z
  .string()
  .trim()
  .min(1, "Date of birth is required.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Please enter a valid date of birth.")
  .transform((value) => new Date(value))
  .refine((dob) => dob.getTime() <= Date.now(), "Date of birth cannot be in the future.")
  .refine((dob) => calculateAge(dob) >= MIN_CANDIDATE_AGE, `You must be at least ${MIN_CANDIDATE_AGE} to register.`);

const niNumberSchema = z
  .string()
  .trim()
  .min(1, "NI Number is required.")
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .refine((value) => NI_NUMBER_REGEX.test(value), "Please enter a valid National Insurance number.");

export const candidateProfileContinueSchema = z.object({
  intent: z.literal("continue"),
  title: z.enum(titleValues, { message: "Please select a title." }),
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  middleName: z.string().trim().max(100).optional(),
  surname: z.string().trim().min(1, "Surname is required.").max(100),
  gender: z.enum(genderValues, { message: "Please select a gender." }),
  dateOfBirth: dateOfBirthSchema,
  nationality: z.string().trim().min(1, "Please select a nationality.").max(64),
  niNumber: niNumberSchema,
  isStudying: z.boolean({ message: "Please answer the studying question." }),
  hasUnspentConvictions: z.boolean({ message: "Please answer the convictions question." }),
  mobileDialCode: z.string().trim().regex(DIAL_CODE_REGEX, "Please select a valid dialing code."),
  mobileNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => MOBILE_NUMBER_REGEX.test(value), "Mobile number must be exactly 10 digits."),
  avatarS3Key: z.string().trim().max(500).optional(),
  addressLine1: z.string().trim().min(1, "Address line 1 is required.").max(500),
  addressLine2: z.string().trim().max(500).optional(),
  townOrCity: z.string().trim().min(1, "Town / City is required.").max(100),
  countyOrRegion: z.string().trim().max(100).optional(),
  postcode: z
    .string()
    .trim()
    .min(1, "Postcode is required.")
    .max(8)
    .transform((value) => value.toUpperCase())
    .refine((value) => UK_POSTCODE_REGEX.test(value), "Please enter a valid UK postcode."),
});

export const candidateProfileDraftSchema = z.object({
  intent: z.literal("draft"),
  title: z.enum(titleValues).optional(),
  firstName: z.string().trim().max(100).optional(),
  middleName: z.string().trim().max(100).optional(),
  surname: z.string().trim().max(100).optional(),
  gender: z.enum(genderValues).optional(),
  dateOfBirth: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Please enter a valid date of birth.")
    .transform((value) => new Date(value))
    .optional(),
  nationality: z.string().trim().max(64).optional(),
  niNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .optional(),
  isStudying: z.boolean().optional(),
  hasUnspentConvictions: z.boolean().optional(),
  mobileDialCode: z.string().trim().max(8).optional(),
  mobileNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length <= 10, "Mobile number must be at most 10 digits.")
    .optional(),
  avatarS3Key: z.string().trim().max(500).optional(),
  addressLine1: z.string().trim().max(500).optional(),
  addressLine2: z.string().trim().max(500).optional(),
  townOrCity: z.string().trim().max(100).optional(),
  countyOrRegion: z.string().trim().max(100).optional(),
  postcode: z
    .string()
    .trim()
    .max(8)
    .transform((value) => value.toUpperCase())
    .optional(),
});

export type CandidateProfileContinueInput = z.infer<typeof candidateProfileContinueSchema>;
export type CandidateProfileDraftInput = z.infer<typeof candidateProfileDraftSchema>;

const intentSchema = z.object({ intent: z.enum(["draft", "continue"]) });

/** Picks the draft or continue schema based on the payload's own `intent` field, then parses against it. */
export function parseCandidateProfileInput(body: unknown) {
  const intentResult = intentSchema.safeParse(body);
  if (!intentResult.success) {
    return intentResult;
  }
  return intentResult.data.intent === "continue"
    ? candidateProfileContinueSchema.safeParse(body)
    : candidateProfileDraftSchema.safeParse(body);
}
