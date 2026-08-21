import { Router } from "express";
import { listCases, dispatchCase, simulateCase } from "#controllers/case.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";
import { simulateCaseLimiter } from "#middlewares/rateLimit.middleware.js";
import { validateBody } from "#middlewares/validate.middleware.js";
import { dispatchCaseSchema } from "#schemas/case.schema.js";

const router = Router();
router.get("/", authenticate, listCases);
router.patch("/:id/dispatch", authenticate, validateBody(dispatchCaseSchema), dispatchCase);
router.post("/simulate", authenticate, simulateCaseLimiter, simulateCase);

export default router;
