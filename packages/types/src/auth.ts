import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "EDITOR"]);
export type Role = z.infer<typeof roleSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: roleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;
