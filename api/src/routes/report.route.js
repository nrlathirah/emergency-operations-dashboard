import { Router } from "express";
import {
  getDateBoundsReport,
  getCasesSummary,
  getCasesByAgency,
  getVehicleUtilizationReport,
  getCasesByPriority,
  getCasesByCategory,
  getCasesTrendReport,
  getResponseTimeTrendReport,
  getPeriodComparisonReport,
  getResponseTimeReport,
  getCasesByHourReport,
  getPriorityByAgencyReport,
  getCasesTable,
  exportCasesExcel,
  exportFullReportExcel,
} from "#controllers/report.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/date-bounds", authenticate, getDateBoundsReport);
router.get("/cases-summary", authenticate, getCasesSummary);
router.get("/cases-by-agency", authenticate, getCasesByAgency);
router.get("/vehicle-utilization", authenticate, getVehicleUtilizationReport);
router.get("/cases-by-priority", authenticate, getCasesByPriority);
router.get("/cases-by-category", authenticate, getCasesByCategory);
router.get("/cases-trend", authenticate, getCasesTrendReport);
router.get("/response-time-trend", authenticate, getResponseTimeTrendReport);
router.get("/period-comparison", authenticate, getPeriodComparisonReport);
router.get("/response-time", authenticate, getResponseTimeReport);
router.get("/cases-by-hour", authenticate, getCasesByHourReport);
router.get("/priority-by-agency", authenticate, getPriorityByAgencyReport);
router.get("/cases-table", authenticate, getCasesTable);
router.get("/cases/export", authenticate, exportCasesExcel);
router.get("/export-full", authenticate, exportFullReportExcel);

export default router;
