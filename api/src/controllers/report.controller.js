import {
  generateCasesExcel,
  getCasesSummaryByStatus,
  getCasesSummaryByAgency,
  getVehicleUtilization,
  getCasesSummaryByPriority,
  getCasesSummaryByCategory,
  getCasesTrend,
  getAverageResponseTime,
} from "#services/report.service.js";
import { getCasesPage } from "#services/case.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

export const getCasesSummary = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByStatus({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getCasesByAgency = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByAgency({ agencyCode: getScopedAgency(req) });
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
    const summary = await getCasesSummaryByPriority({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getCasesByCategory = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByCategory({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const getCasesTrendReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trend = await getCasesTrend({ agencyCode: getScopedAgency(req), days });
    res.status(200).json({ data: trend });
  } catch (error) {
    next(error);
  }
};

export const getResponseTimeReport = async (req, res, next) => {
  try {
    const data = await getAverageResponseTime({ agencyCode: getScopedAgency(req) });
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
      page,
      limit,
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
