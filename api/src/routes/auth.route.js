import { Router } from "express";
import { login, requestPasswordReset } from "#controllers/auth.controller.js";
import { loginLimiter, passwordResetLimiter } from "#middlewares/rateLimit.middleware.js";
import { validateBody } from "#middlewares/validate.middleware.js";
import { loginSchema, requestPasswordResetSchema } from "#schemas/auth.schema.js";

const router = Router();
router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/request-password-reset", passwordResetLimiter, validateBody(requestPasswordResetSchema), requestPasswordReset);

export default router;
