import { z } from "zod";
import { localeSchema } from "./common.js";

export const leadTypeSchema = z.enum(["CONTACT", "CONSULTATION", "QUOTE"]);
export const leadStatusSchema = z.enum(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"]);

/** Bangladeshi mobile: 11 digits, 01[3-9] prefix. Accepts +880/880 and separators. */
const bdPhone = z
  .string()
  .transform((raw) => raw.replace(/[\s-()]/g, "").replace(/^\+?880/, "0"))
  .refine((v) => /^01[3-9]\d{8}$/.test(v), {
    message: "Must be a valid Bangladeshi mobile number",
  });

export const createLeadSchema = z.object({
  type: leadTypeSchema,
  name: z.string().trim().min(1).max(120),
  phone: bdPhone,
  email: z.string().trim().toLowerCase().email().optional(),
  message: z.string().trim().max(4000).optional(),
  serviceId: z.string().cuid().optional(),
  sourcePath: z.string().max(300).optional(),
  locale: localeSchema,
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  internalNotes: z.string().max(4000).optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
