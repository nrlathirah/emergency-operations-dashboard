import { z } from "zod";

// Login intentionally does NOT enforce a minimum password length — that
// belongs on schemas that CREATE a password (below), not one checking an
// existing one against whatever policy was in force when it was set.
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").max(254),
  password: z.string().min(1, "Password is required.").max(200),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").max(254),
});
