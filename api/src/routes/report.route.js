import { Router } from "express";
import {
  getCasesSummary,
  getCasesByAgency,
  getVehicleUtilizationReport,
  getCasesByPriority,
  getCasesByCategory,
  getCasesTrendReport,
  getResponseTimeReport,
  exportCasesExcel,
} from "#controllers/report.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/cases-summary", authenticate, getCasesSummary);
router.get("/cases-by-agency", authenticate, getCasesByAgency);
router.get("/vehicle-utilization", authenticate, getVehicleUtilizationReport);
router.get("/cases-by-priority", authenticate, getCasesByPriority);
router.get("/cases-by-category", authenticate, getCasesByCategory);
router.get("/cases-trend", authenticate, getCasesTrendReport);
router.get("/response-time", authenticate, getResponseTimeReport);
router.get("/cases/export", authenticate, exportCasesExcel);

export default router;
