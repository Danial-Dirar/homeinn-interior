import { z } from "zod";

export const localeSchema = z.enum(["en", "bn"]);
export type Locale = z.infer<typeof localeSchema>;

export const idSchema = z.string().cuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Builds `{ <field>En, <field>Bn }`, both required and non-empty. */
export function bilingualText<F extends string>(field: F, max = 5000) {
  // The cast is what carries the literal key names through to the inferred
  // type; computed keys alone would widen the shape to an index signature.
  return z.object({
    [`${field}En`]: z.string().trim().min(1).max(max),
    [`${field}Bn`]: z.string().trim().min(1).max(max),
  } as { [K in `${F}En` | `${F}Bn`]: z.ZodString });
}
