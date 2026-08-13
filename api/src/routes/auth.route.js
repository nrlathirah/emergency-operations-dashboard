import { Router } from "express";
import { login, requestPasswordReset } from "#controllers/auth.controller.js";

const router = Router();
router.post("/login", login);
router.post("/request-password-reset", requestPasswordReset);

export default router;
