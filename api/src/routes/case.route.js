import { Router } from "express";
import { listCases, dispatchCase } from "#controllers/case.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, listCases);
router.patch("/:id/dispatch", authenticate, dispatchCase);

export default router;
