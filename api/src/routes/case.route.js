import { Router } from "express";
import { listCases } from "#controllers/case.controller.js";

const router = Router();
router.get("/", listCases);

export default router;
