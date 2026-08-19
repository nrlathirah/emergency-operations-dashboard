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

const formatMinutes = (totalMinutes) => {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

// --color, --line, etc — same palette the app itself uses, so the sheet's
// borders/fills read as "this app's report", not a generic spreadsheet.
const BORDER_COLOR = "FFD8E3E0";
const HEADER_FILL = "FFE7EFED";
const THIN_BORDER = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

const styleHeaderRow = (row) => {
  row.font = { bold: true };
  row.alignment = { horizontal: "center", vertical: "middle" };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = THIN_BORDER;
  });
};

export const generateCasesExcel = async ({ agencyCode, status } = {}) => {
  const cases = await getAllCases({ agencyCode, status, includeAll: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cases");

  // Column keys/widths only here — no `header`, since headers are written
  // manually below (after the title/scope info rows, not in row 1).
  const dateColumn = { width: 20, style: { numFmt: "dd mmm yyyy hh:mm AM/PM" } };
  sheet.columns = [
    { key: "caseNumber", width: 15 },
    { key: "agency", width: 10 },
    { key: "category", width: 16 },
    { key: "priority", width: 10 },
    { key: "status", width: 12 },
    { key: "location", width: 30 },
    { key: "createdAt", ...dateColumn },
    { key: "resolvedIn", width: 14 },
  ];
  const columnCount = sheet.columns.length;

  const titleRow = sheet.addRow(["Case History Report"]);
  titleRow.font = { bold: true, size: 16 };
  titleRow.alignment = { horizontal: "center" };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, columnCount);

  sheet.addRow([]); // spacer — keeps the scope rows from crowding the title

  // Scope shown as separate label/value cells (not one run-on sentence) so
  // it reads as a short, scannable fact sheet rather than a caption.
  const agencyRow = sheet.addRow(["Agency:", agencyCode || "All Agencies"]);
  agencyRow.getCell(1).font = { bold: true };
  const statusRow = sheet.addRow(["Status:", status ? status.charAt(0).toUpperCase() + status.slice(1) : "All"]);
  statusRow.getCell(1).font = { bold: true };

  sheet.addRow([]); // spacer before the table

  const HEADER_ROW = 6;
  const headerRow = sheet.addRow(["Case ID", "Agency", "Category", "Priority", "Status", "Location", "Created", "Resolved In"]);
  styleHeaderRow(headerRow);

  const priorityCounts = { low: 0, medium: 0, high: 0 };
  const resolvedDurations = [];

  cases.forEach((c) => {
    const resolvedInMinutes = c.status === "closed" ? Math.round((new Date(c.updatedAt) - new Date(c.createdAt)) / 60000) : null;
    if (resolvedInMinutes !== null) resolvedDurations.push(resolvedInMinutes);
    if (priorityCounts[c.priority] !== undefined) priorityCounts[c.priority] += 1;
    const row = sheet.addRow({
      caseNumber: c.caseNumber,
      agency: c.Agency?.code,
      category: c.category,
      priority: c.priority,
      status: c.status,
      location: c.location,
      createdAt: c.createdAt,
      resolvedIn: resolvedInMinutes === null ? "—" : formatMinutes(resolvedInMinutes),
    });
    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  });

  // Filter dropdown arrows already active on open — no manual "Data > Filter" step.
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW + cases.length, column: columnCount },
  };
  // Keep the title/scope info and header row visible while scrolling.
  sheet.views = [{ state: "frozen", ySplit: HEADER_ROW }];

  sheet.addRow([]); // spacer

  const summaryHeaderRow = sheet.addRow(["Metric", "Value"]);
  styleHeaderRow(summaryHeaderRow);

  const addSummaryRow = (label, value) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: "right" };
    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
    return row;
  };

  addSummaryRow("Total Records", cases.length);
  addSummaryRow("Low Priority", priorityCounts.low);
  addSummaryRow("Medium Priority", priorityCounts.medium);
  addSummaryRow("High Priority", priorityCounts.high);
  if (resolvedDurations.length > 0) {
    const avgMinutes = Math.round(resolvedDurations.reduce((sum, m) => sum + m, 0) / resolvedDurations.length);
    addSummaryRow("Average Resolution Time", formatMinutes(avgMinutes));
  }

  // A page footer (Excel's own, via headerFooter) only ever shows up in
  // Print Preview / on the printed page itself — never while just scrolling
  // the sheet — and &C repeats it bottom-center on every printed page,
  // unlike a plain row which would only ever land once, wherever the data
  // happened to end.
  const generatedAt = new Date().toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  sheet.headerFooter.oddFooter = `&C&9&IGenerated: ${generatedAt}`;

  return workbook.xlsx.writeBuffer();
};
