import { Router } from "express";
import { getCasesSummary, exportCasesExcel } from "#controllers/report.controller.js";

const router = Router();
router.get("/cases-summary", getCasesSummary);
router.get("/cases/export", exportCasesExcel);

export default router;
