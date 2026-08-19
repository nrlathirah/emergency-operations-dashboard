import {
  generateCasesExcel,
  generateFullReportExcel,
  getCasesSummaryByStatus,
  getCasesSummaryByAgency,
  getVehicleUtilization,
  getCasesSummaryByPriority,
  getCasesSummaryByCategory,
  getCasesTrend,
  getResponseTimeTrend,
  getPeriodComparison,
  getAverageResponseTime,
  getCasesByHour,
  getPriorityByAgency,
} from "#services/report.service.js";
import { getCasesPage, getEarliestCaseDate } from "#services/case.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

// Pulled out once — every date-filterable report handler reads the same
// two optional query params the same way.
const getDateRange = (req) => ({ startDate: req.query.startDate, endDate: req.query.endDate });

// Lets the frontend show a real date ("19 May 2026 to 19 Aug 2026") instead
// of a vague "All Time" label when no range is picked — client-side chart
// exports (image/Excel) are generated entirely in the browser, so they need
// to know the actual earliest case on record themselves.
export const getDateBoundsReport = async (req, res, next) => {
  try {
    const earliestDate = await getEarliestCaseDate({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: { earliestDate } });
  } catch (error) {
    next(error);
  }
};

export const getCasesSummary = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByStatus({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getCasesByAgency = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByAgency({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getVehicleUtilizationReport = async (req, res, next) => {
  try {
    const summary = await getVehicleUtilization({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getCasesByPriority = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByPriority({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getCasesByCategory = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByCategory({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getCasesTrendReport = async (req, res, next) => {
  try {
    const trend = await getCasesTrend({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data: trend });
  } catch (error) {
    next(error);
  }
};

export const getResponseTimeTrendReport = async (req, res, next) => {
  try {
    const trend = await getResponseTimeTrend({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data: trend });
  } catch (error) {
    next(error);
  }
};

export const getPeriodComparisonReport = async (req, res, next) => {
  try {
    const comparison = await getPeriodComparison({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data: comparison });
  } catch (error) {
    next(error);
  }
};

export const getResponseTimeReport = async (req, res, next) => {
  try {
    const data = await getAverageResponseTime({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

export const getCasesByHourReport = async (req, res, next) => {
  try {
    const data = await getCasesByHour({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

export const getPriorityByAgencyReport = async (req, res, next) => {
  try {
    const data = await getPriorityByAgency({ agencyCode: getScopedAgency(req), ...getDateRange(req) });
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

export const getCasesTable = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await getCasesPage({
      agencyCode: getScopedAgency(req),
      status: req.query.status,
      sort: req.query.sort,
      order: req.query.order,
      search: req.query.search,
      category: req.query.category,
      priority: req.query.priority,
      page,
      limit,
      ...getDateRange(req),
    });
    res.status(200).json({
      data: result.cases,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

export const exportCasesExcel = async (req, res, next) => {
  try {
    const buffer = await generateCasesExcel({
      agencyCode: getScopedAgency(req),
      status: req.query.status,
      search: req.query.search,
      category: req.query.category,
      priority: req.query.priority,
      ...getDateRange(req),
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=cases-report.xlsx");
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

export const exportFullReportExcel = async (req, res, next) => {
  try {
    const buffer = await generateFullReportExcel({
      agencyCode: getScopedAgency(req),
      isSuperAdmin: req.user.role === "super_admin",
      ...getDateRange(req),
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=full-report.xlsx");
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};
