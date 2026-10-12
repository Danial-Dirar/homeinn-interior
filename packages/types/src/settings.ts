import { z } from "zod";
import { bilingualText } from "./common.js";

/** A link, or `""` to remove it from the site. */
const url = z
  .union([z.string().trim().url().max(300), z.literal("")])
  .transform((value) => (value === "" ? null : value));

/**
 * The whole settings row is editable, so create and update are the same shape:
 * there is exactly one row (`id: "singleton"`) and the admin only ever edits it.
 */
export const updateSettingsSchema = bilingualText("address", 500)
  .merge(bilingualText("hours", 200))
  .merge(
    z.object({
      phone: z.string().trim().min(1).max(40),
      whatsapp: z.string().trim().min(1).max(40),
      // A second line, optional. `""` clears it rather than leaving a stale
      // number on the site, so the admin can remove one without a null.
      phoneSecondary: z.string().trim().max(40).nullable().optional(),
      whatsappSecondary: z.string().trim().max(40).nullable().optional(),
      email: z.string().trim().toLowerCase().email(),
      facebookUrl: url.optional(),
      instagramUrl: url.optional(),
      youtubeUrl: url.optional(),
      establishedYear: z.number().int().min(1900).max(2100),
      corporateProjectCount: z.number().int().min(0),
      residentialProjectCount: z.number().int().min(0),
      districtCount: z.number().int().min(0),
    }),
  )
  .partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
