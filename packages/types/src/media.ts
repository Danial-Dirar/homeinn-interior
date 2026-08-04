import { z } from "zod";

export const uploadMediaSchema = z.object({
  altEn: z.string().trim().min(1).max(300),
  altBn: z.string().trim().min(1).max(300),
});
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
