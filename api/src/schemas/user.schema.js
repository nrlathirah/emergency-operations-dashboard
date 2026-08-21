import { z } from "zod";

// Mirrors AGENCY_COLORS / the seeded agency codes across the frontend
// (LoginPage.vue, VehicleMap.vue) — kept as a plain array here rather than
// importing that config, since this is the one place a bad/unknown code
// actually needs to be rejected outright instead of just falling back to a
// neutral color.
const AGENCY_CODES = ["KKM", "PDRM", "JBPM"];

// 8 chars minimum is enforced here — the actual floor for anything that
// SETS a password. Login (auth.schema.js) deliberately doesn't reuse this,
// since it's checking a password against whatever policy was live when it
// was created, not creating a new one.
const passwordField = z.string().min(8, "Password must be at least 8 characters.").max(200);
const nameField = z.string().trim().min(1, "Name is required.").max(100);

export const createUserSchema = z.object({
  name: nameField,
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: passwordField,
  role: z.enum(["staff", "super_admin"]).optional(),
  agencyCode: z.enum(AGENCY_CODES).nullish(),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required.").max(200),
  newPassword: passwordField,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordField,
});

export const changeNameSchema = z.object({
  name: nameField,
});

export const updateStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});
