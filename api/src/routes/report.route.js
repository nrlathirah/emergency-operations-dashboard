import { Router } from "express";
import {
  getCasesSummary,
  getCasesByAgency,
  getVehicleUtilizationReport,
  exportCasesExcel,
} from "#controllers/report.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/cases-summary", authenticate, getCasesSummary);
router.get("/cases-by-agency", authenticate, getCasesByAgency);
router.get("/vehicle-utilization", authenticate, getVehicleUtilizationReport);
router.get("/cases/export", authenticate, exportCasesExcel);

export default router;
