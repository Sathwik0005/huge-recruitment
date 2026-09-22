import { z } from "zod";

// Permissive: allows UK/international formats (spaces, +, parens, digits),
// rejects obvious garbage rather than enforcing a strict regional pattern.
const PHONE_REGEX = /^[+()\d\s-]{7,30}$/;

export const CONTACT_REASONS = ["hiring", "working", "general", "other"] as const;

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Full name is required.").max(100),
  company: z.string().trim().max(150).optional().default(""),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(30)
    .regex(PHONE_REGEX, "Please enter a valid phone number."),
  reason: z.enum(CONTACT_REASONS, { message: "Please select a reason for contact." }),
  message: z.string().trim().min(1, "Message is required.").max(5000),
  // Honeypot — must arrive empty. Real users never see or fill this field.
  companyWebsite: z.string().max(0).optional().default(""),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const EMPLOYER_SECTOR_OPTIONS = [
  "Warehousing",
  "Distribution",
  "Manufacturing",
  "Production",
  "Automotive",
  "Other",
] as const;

export const employerRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(100),
  companyEmail: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  sector: z.enum(EMPLOYER_SECTOR_OPTIONS, { message: "Please select an industry sector." }),
  requirementDetail: z.string().trim().max(5000).optional().default(""),
  // Honeypot — must arrive empty. Real users never see or fill this field.
  companyWebsite: z.string().max(0).optional().default(""),
});

export type EmployerRequestInput = z.infer<typeof employerRequestSchema>;
