import ExcelJS from "exceljs";
import { getAllCases } from "./case.service.js";
import { getAllVehicles } from "./vehicle.service.js";

export const getCasesSummaryByStatus = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const summary = {};
  cases.forEach((c) => {
    summary[c.status] = (summary[c.status] || 0) + 1;
  });
  return summary;
};

export const getCasesSummaryByAgency = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const summary = {};
  cases.forEach((c) => {
    const key = c.Agency?.code || "Unknown";
    summary[key] = (summary[key] || 0) + 1;
  });
  return summary;
};

export const getVehicleUtilization = async ({ agencyCode } = {}) => {
  const vehicles = await getAllVehicles({ agencyCode });
  const summary = {};
  vehicles.forEach((v) => {
    summary[v.status] = (summary[v.status] || 0) + 1;
  });
  return summary;
};

export const getCasesSummaryByPriority = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const summary = {};
  cases.forEach((c) => {
    summary[c.priority] = (summary[c.priority] || 0) + 1;
  });
  return summary;
};

export const getCasesSummaryByCategory = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const summary = {};
  cases.forEach((c) => {
    summary[c.category] = (summary[c.category] || 0) + 1;
  });
  return summary;
};

// Daily case counts for the last `days` days, zero-filled so gaps (no cases
// that day) render as a dip on the trend line instead of just vanishing.
export const getCasesTrend = async ({ agencyCode, days = 30 } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const counts = {};
  cases.forEach((c) => {
    const createdAt = new Date(c.createdAt);
    if (createdAt.getTime() < cutoff) return;
    const dateKey = createdAt.toISOString().slice(0, 10);
    counts[dateKey] = (counts[dateKey] || 0) + 1;
  });

  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    trend.push({ date: dateKey, count: counts[dateKey] || 0 });
  }
  return trend;
};

// Case volume bucketed by hour of day (0-23), zero-filled so quiet hours
// still show as an empty cell instead of just being absent.
export const getCasesByHour = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const counts = new Array(24).fill(0);
  cases.forEach((c) => {
    const hour = new Date(c.createdAt).getHours();
    counts[hour] += 1;
  });
  return counts.map((count, hour) => ({ hour, count }));
};

// Priority mix per agency — a cross-tab, not just a single breakdown, so
// e.g. "does KKM run hotter/more urgent than PDRM" is visible at a glance
// instead of only each dimension shown separately.
export const getPriorityByAgency = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const byAgency = {};
  cases.forEach((c) => {
    const code = c.Agency?.code || "Unknown";
    if (!byAgency[code]) byAgency[code] = { low: 0, medium: 0, high: 0 };
    if (byAgency[code][c.priority] !== undefined) byAgency[code][c.priority] += 1;
  });
  return byAgency;
};

// Response time is derived from `updatedAt - createdAt` on closed cases —
// the model has no dedicated "resolvedAt" column, and a closed case's last
// update is, by construction, the moment it was closed.
export const getAverageResponseTime = async ({ agencyCode } = {}) => {
  const closedCases = await getAllCases({ agencyCode, status: "closed" });
  const durationsMinutes = closedCases.map((c) => (new Date(c.updatedAt) - new Date(c.createdAt)) / 60000);

  const average = (values) => (values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0);

  const byPriorityMinutes = {};
  ["low", "medium", "high"].forEach((priority) => {
    const subset = closedCases
      .filter((c) => c.priority === priority)
      .map((c) => (new Date(c.updatedAt) - new Date(c.createdAt)) / 60000);
    byPriorityMinutes[priority] = average(subset);
  });

  return {
    overallMinutes: average(durationsMinutes),
    byPriorityMinutes,
    sampleSize: closedCases.length,
  };
};

export const generateCasesExcel = async ({ agencyCode, status } = {}) => {
  const cases = await getAllCases({ agencyCode, status, includeAll: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cases");

  sheet.columns = [
    { header: "Case ID", key: "caseNumber", width: 15 },
    { header: "Agency", key: "agency", width: 10 },
    { header: "Category", key: "category", width: 15 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Status", key: "status", width: 15 },
    { header: "Location", key: "location", width: 30 },
  ];

  cases.forEach((c) => {
    sheet.addRow({
      caseNumber: c.caseNumber,
      agency: c.Agency?.code,
      category: c.category,
      priority: c.priority,
      status: c.status,
      location: c.location,
    });
  });

  return workbook.xlsx.writeBuffer();
};
