import { Router } from "express";
import { listCases } from "#controllers/case.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, listCases);

export default router;
