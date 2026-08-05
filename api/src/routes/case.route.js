import { Router } from "express";
import { listCases, dispatchCase, simulateCase } from "#controllers/case.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, listCases);
router.patch("/:id/dispatch", authenticate, dispatchCase);
router.post("/simulate", authenticate, simulateCase);

export default router;
