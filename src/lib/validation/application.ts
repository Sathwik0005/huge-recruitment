import { z } from "zod";
import { ALLOWED_CV_CONTENT_TYPES, MAX_CV_SIZE_BYTES } from "@/lib/blob";

// Permissive: allows UK/international formats (spaces, +, parens, digits),
// rejects obvious garbage rather than enforcing a strict regional pattern.
const PHONE_REGEX = /^[+()\d\s-]{7,30}$/;

export const guestApplicationSchema = z.object({
  jobId: z.string().trim().min(1),
  fullName: z.string().trim().min(1, "Full name is required.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(30)
    .regex(PHONE_REGEX, "Please enter a valid phone number."),
  location: z.string().trim().min(1, "Current location is required.").max(120),
  privacyConsent: z.literal(true, { message: "You must accept the Privacy Policy to continue." }),
  // Honeypot — must arrive empty. Real users never see or fill this field.
  companyWebsite: z.string().max(0).optional().default(""),
  cv: z
    .object({
      pathname: z.string().min(1),
      originalFilename: z.string().min(1).max(255),
      mimeType: z.enum(ALLOWED_CV_CONTENT_TYPES),
      sizeBytes: z
        .number()
        .int()
        .positive()
        .max(MAX_CV_SIZE_BYTES, "Your CV must be 5 MB or smaller."),
    })
    .optional(),
});

export type GuestApplicationInput = z.infer<typeof guestApplicationSchema>;

export const PRIVACY_POLICY_VERSION = "2026-01-01";

export const DUPLICATE_SUBMISSION_WINDOW_MINUTES = 10;
