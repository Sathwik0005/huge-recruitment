import { z } from "zod";

const rightToWorkDocumentTypeValues = ["PASSPORT", "ID_CARD", "BRP_EVISA"] as const;
const brpSubtypeValues = ["PHYSICAL_BRP", "EVISA"] as const;

// Treats an empty string the same as an absent value — the client always sends
// date fields as a string (possibly "") rather than omitting the key.
const optionalFullDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), "Please enter a valid date.")
  .transform((value) => (value === undefined ? undefined : new Date(value)));

const optionalTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

// Share code shown/reused across all three right-to-work branches (Passport,
// ID Card, BRP/E-Visa) — GOV.UK share codes are exactly 9 alphanumeric
// characters (e.g. "W12 345 678"). Spaces are stripped before checking so the
// client's own space-every-3-characters formatting round-trips cleanly.
const SHARE_CODE_REGEX = /^[A-Z0-9]{9}$/;
const shareCodeSchema = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((value) => (value ? value.replace(/\s+/g, "").toUpperCase() : undefined))
  .refine((value) => value === undefined || SHARE_CODE_REGEX.test(value), "Share code must be exactly 9 letters/numbers.");

// Accepts "12345678" or, once dashes are stripped by the client's auto-formatting, "12-34-56"-shaped input.
const accountNumberSchema = z
  .string()
  .trim()
  .refine((value) => /^\d{8}$/.test(value), "Account number must be exactly 8 digits.");

const sortCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/-/g, ""))
  .refine((value) => /^\d{6}$/.test(value), "Sort code must be exactly 6 digits.");

const candidateProfileStep3BaseShape = {
  rightToWorkDocumentType: z.enum(rightToWorkDocumentTypeValues).optional(),
  brpSubtype: z.enum(brpSubtypeValues).optional(),
  visaExpiryDate: optionalFullDateSchema,
  rightToWorkShareCode: shareCodeSchema,
  rightToWorkShareCodeExpiryDate: optionalFullDateSchema,
  rightToWorkDocFrontS3Key: optionalTextSchema(500),
  rightToWorkDocFrontOriginalFilename: optionalTextSchema(255),
  rightToWorkDocBackS3Key: optionalTextSchema(500),
  rightToWorkDocBackOriginalFilename: optionalTextSchema(255),
  bankAccountHolderName: optionalTextSchema(150),
  bankAccountNumber: accountNumberSchema.optional(),
  bankSortCode: sortCodeSchema.optional(),
  bankStatementS3Key: optionalTextSchema(500),
  bankStatementOriginalFilename: optionalTextSchema(255),
};

export const candidateProfileStep3DraftSchema = z.object({
  intent: z.literal("draft"),
  ...candidateProfileStep3BaseShape,
});

export const candidateProfileStep3SubmitSchema = z
  .object({
    intent: z.literal("submit"),
    ...candidateProfileStep3BaseShape,
  })
  .superRefine((value, ctx) => {
    const require = (condition: unknown, path: string, message: string) => {
      if (!condition) ctx.addIssue({ code: "custom", path: [path], message });
    };

    if (!value.rightToWorkDocumentType) {
      ctx.addIssue({ code: "custom", path: ["rightToWorkDocumentType"], message: "Please select an identity document type." });
    } else if (value.rightToWorkDocumentType === "PASSPORT") {
      require(value.rightToWorkDocFrontS3Key, "rightToWorkDocFrontS3Key", "Passport front cover is required.");
      require(value.rightToWorkDocBackS3Key, "rightToWorkDocBackS3Key", "Passport picture page is required.");
      require(value.visaExpiryDate, "visaExpiryDate", "Visa expiry date is required.");
      require(value.rightToWorkShareCode, "rightToWorkShareCode", "Share code is required.");
      // rightToWorkShareCodeExpiryDate is intentionally not required for the passport branch.
    } else if (value.rightToWorkDocumentType === "ID_CARD") {
      require(value.rightToWorkDocFrontS3Key, "rightToWorkDocFrontS3Key", "ID card front is required.");
      require(value.rightToWorkDocBackS3Key, "rightToWorkDocBackS3Key", "ID card back is required.");
      require(value.rightToWorkShareCode, "rightToWorkShareCode", "Right to work share code is required.");
      require(value.rightToWorkShareCodeExpiryDate, "rightToWorkShareCodeExpiryDate", "Share code expiry date is required.");
    } else if (value.rightToWorkDocumentType === "BRP_EVISA") {
      if (!value.brpSubtype) {
        ctx.addIssue({ code: "custom", path: ["brpSubtype"], message: "Please select physical BRP or e-visa." });
      } else if (value.brpSubtype === "PHYSICAL_BRP") {
        require(value.rightToWorkDocFrontS3Key, "rightToWorkDocFrontS3Key", "Residence permit front is required.");
        require(value.rightToWorkDocBackS3Key, "rightToWorkDocBackS3Key", "Residence permit back is required.");
      } else {
        require(value.rightToWorkShareCode, "rightToWorkShareCode", "Right to work share code is required.");
        require(value.rightToWorkShareCodeExpiryDate, "rightToWorkShareCodeExpiryDate", "Status expiry date is required.");
      }
    }

    // Bank details are always required on submit, regardless of the right-to-work branch.
    require(value.bankAccountHolderName, "bankAccountHolderName", "Account holder name is required.");
    require(value.bankAccountNumber, "bankAccountNumber", "Account number is required.");
    require(value.bankSortCode, "bankSortCode", "Sort code is required.");
    require(value.bankStatementS3Key, "bankStatementS3Key", "Proof of bank account details is required.");
  });

export type CandidateProfileStep3DraftInput = z.infer<typeof candidateProfileStep3DraftSchema>;
export type CandidateProfileStep3SubmitInput = z.infer<typeof candidateProfileStep3SubmitSchema>;

const intentSchema = z.object({ intent: z.enum(["draft", "submit"]) });

/** Picks the draft or submit schema based on the payload's own `intent` field, then parses against it. */
export function parseCandidateProfileStep3Input(body: unknown) {
  const intentResult = intentSchema.safeParse(body);
  if (!intentResult.success) {
    return intentResult;
  }
  return intentResult.data.intent === "submit"
    ? candidateProfileStep3SubmitSchema.safeParse(body)
    : candidateProfileStep3DraftSchema.safeParse(body);
}
