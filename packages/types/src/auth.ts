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

/** Ten characters at least: the panel guards the whole public site. */
const newPassword = z.string().min(10).max(200);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  role: roleSchema,
  password: newPassword,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: roleSchema.optional(),
  password: newPassword.optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
