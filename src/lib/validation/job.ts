import { z } from "zod";
import { EmploymentType, PayPeriod, PayType, ShiftCategory } from "@/generated/prisma/enums";

const employmentTypeSchema = z.enum(EmploymentType);
const payTypeSchema = z.enum(PayType);
const payPeriodSchema = z.enum(PayPeriod);
const shiftCategorySchema = z.enum(ShiftCategory);

export const payRateInputSchema = z
  .object({
    label: z.string().trim().max(60).optional(),
    minimum: z.coerce.number().positive("Minimum pay must be greater than zero."),
    maximum: z.coerce.number().positive().optional(),
    period: payPeriodSchema,
    isPrimary: z.boolean().default(false),
    displayOrder: z.number().int().default(0),
  })
  .refine((rate) => rate.maximum === undefined || rate.maximum >= rate.minimum, {
    message: "Maximum pay must be greater than or equal to minimum pay.",
    path: ["maximum"],
  });

const payRatesArraySchema = z.array(payRateInputSchema).superRefine((rates, ctx) => {
  if (rates.length === 0) return;
  const primaryCount = rates.filter((rate) => rate.isPrimary).length;
  if (primaryCount !== 1) {
    ctx.addIssue({
      code: "custom",
      message: "Exactly one pay rate must be marked as primary.",
    });
  }
});

const shiftInputSchema = z
  .object({
    category: shiftCategorySchema,
    label: z.string().trim().max(80).optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:mm.")
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:mm.")
      .optional(),
    days: z.string().trim().max(80).optional(),
    details: z.string().trim().max(500).optional(),
    displayOrder: z.number().int().default(0),
  })
  .refine((shift) => Boolean(shift.startTime) === Boolean(shift.endTime), {
    message: "Enter both a start time and an end time, or leave both blank.",
    path: ["endTime"],
  });

const textEntrySchema = z.object({
  text: z.string().trim().min(1, "This field cannot be empty.").max(500),
  displayOrder: z.number().int().default(0),
});

export const jobInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(150),
    sectorId: z.string().trim().min(1, "Sector is required."),
    employmentType: employmentTypeSchema,
    overview: z.string().trim().min(1, "Overview is required.").max(5000),
    townOrCity: z.string().trim().min(1, "Town or city is required.").max(100),
    countyOrRegion: z.string().trim().max(100).optional(),
    postcode: z.string().trim().max(20).optional(),
    payType: payTypeSchema,
    payRates: payRatesArraySchema.default([]),
    additionalPayInformation: z.string().trim().max(1000).optional(),
    referenceCode: z.string().trim().max(50).optional(),
    clientId: z.string().trim().optional(),
    shortDescription: z.string().trim().max(300).optional(),
    startDate: z.coerce.date().optional(),
    closingDate: z.coerce.date().optional(),
    vacancyCount: z.coerce.number().int().positive().optional(),
    hoursPerWeek: z.coerce.number().positive().optional(),
    shiftSummary: z.string().trim().max(500).optional(),
    additionalInformation: z.string().trim().max(2000).optional(),
    showPostedDate: z.boolean().default(true),
    featured: z.boolean().default(false),
    shifts: z.array(shiftInputSchema).default([]),
    responsibilities: z.array(textEntrySchema).default([]),
    requirements: z.array(textEntrySchema).default([]),
    benefits: z.array(textEntrySchema).default([]),
  })
  .refine((job) => job.payType !== "COMPETITIVE" || job.payRates.length === 0, {
    message: "Competitive-pay jobs cannot have numeric pay rates.",
    path: ["payRates"],
  })
  .refine((job) => !job.closingDate || !job.startDate || job.closingDate >= job.startDate, {
    message: "Closing date cannot be before the start date.",
    path: ["closingDate"],
  });

export type JobInput = z.infer<typeof jobInputSchema>;

/**
 * Stricter than `jobInputSchema` — validates the mandatory-before-publish
 * business rules: valid compensation (numeric rate(s), or COMPETITIVE) plus
 * every other mandatory field already required by `jobInputSchema`.
 */
export const jobPublishReadinessSchema = jobInputSchema.refine(
  (job) => job.payType === "COMPETITIVE" || job.payRates.length > 0,
  {
    message: "Add at least one pay rate, or switch to Competitive pay.",
    path: ["payRates"],
  }
);
