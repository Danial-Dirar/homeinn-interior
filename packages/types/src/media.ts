import { z } from "zod";

export const uploadMediaSchema = z.object({
  altEn: z.string().trim().min(1).max(300),
  altBn: z.string().trim().min(1).max(300),
});
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;

export const mediaSourceSchema = z.object({
  type: z.string(),
  srcset: z.string(),
});

/**
 * A `Media` row as the public read surface serialises it: the stored columns
 * plus the responsive `srcset` per format. The web app renders `<picture>`
 * straight from this, so the shape is a contract, not an implementation detail.
 */
export const publicMediaSchema = z.object({
  id: z.string(),
  storageKey: z.string(),
  mimeType: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  bytes: z.number().int(),
  blurhash: z.string().nullable(),
  altEn: z.string(),
  altBn: z.string(),
  createdAt: z.coerce.date(),
  sources: z.array(mediaSourceSchema),
});
export type PublicMedia = z.infer<typeof publicMediaSchema>;
