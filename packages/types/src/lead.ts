import { z } from "zod";
import { localeSchema, paginationQuerySchema } from "./common.js";

export const leadTypeSchema = z.enum(["CONTACT", "CONSULTATION", "QUOTE"]);
export const leadStatusSchema = z.enum(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"]);

/**
 * A path on this site — "/bn/contact" — as a browser would read it. Never
 * "//host" or "/\\host", and never one that becomes either: browsers drop
 * tabs and newlines before parsing, so those and any other whitespace or
 * control character are refused too, and the final check is the URL parser's
 * own answer. Shared by the API (which refuses anything else) and the admin
 * inbox (which links nothing else).
 */
export function isSitePath(path: string): boolean {
  if (!path.startsWith("/") || /[\u0000-\u0020\u007F\\]/.test(path)) return false;
  try {
    const base = "https://site.invalid";
    return new URL(path, base).origin === base;
  } catch {
    return false;
  }
}

/** Bangladeshi mobile: 11 digits, 01[3-9] prefix. Accepts +880/880 and separators. */
const bdPhone = z
  .string()
  // Bangla keyboards type Bangla digits (০১৭…); read them as the same number.
  .transform((raw) => raw
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
    .replace(/[\s-()]/g, "")
    .replace(/^\+?880/, "0"))
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
  // A path on this site ("/bn/contact"). The admin inbox shows it as a link, so
  // anything else — a javascript: URL, another site, a protocol-relative
  // "//host" or "/\\host" — is refused here rather than trusted there.
  sourcePath: z
    .string()
    .max(300)
    .refine(isSitePath, { message: "Must be a path on this site" })
    .optional(),
  locale: localeSchema,
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  internalNotes: z.string().max(4000).optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

/** `GET /api/leads?status=NEW&page=1` — the inbox's filter and paging. */
export const leadListQuerySchema = paginationQuerySchema.extend({
  status: leadStatusSchema.optional(),
});
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
