import ExcelJS from "exceljs";
import { getAllCases, getEarliestCaseDate } from "./case.service.js";
import { getAllVehicles } from "./vehicle.service.js";

export const getCasesSummaryByStatus = async ({ agencyCode, startDate, endDate } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true, startDate, endDate });
  const summary = {};
  cases.forEach((c) => {
    summary[c.status] = (summary[c.status] || 0) + 1;
  });
  return summary;
};

export const getCasesSummaryByAgency = async ({ agencyCode, startDate, endDate } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true, startDate, endDate });
  const summary = {};
  cases.forEach((c) => {
    const key = c.Agency?.code || "Unknown";
    summary[key] = (summary[key] || 0) + 1;
  });
  return summary;
};

// Vehicle status is a live fleet snapshot, not a historical record — there's
// no createdAt to bucket by, so this intentionally has no date-range param.
export const getVehicleUtilization = async ({ agencyCode } = {}) => {
  const vehicles = await getAllVehicles({ agencyCode });
  const summary = {};
  vehicles.forEach((v) => {
    summary[v.status] = (summary[v.status] || 0) + 1;
  });
  return summary;
};

export const getCasesSummaryByPriority = async ({ agencyCode, startDate, endDate } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true, startDate, endDate });
  const summary = {};
  cases.forEach((c) => {
    summary[c.priority] = (summary[c.priority] || 0) + 1;
  });
  return summary;
};

export const getCasesSummaryByCategory = async ({ agencyCode, startDate, endDate } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true, startDate, endDate });
  const summary = {};
  cases.forEach((c) => {
    summary[c.category] = (summary[c.category] || 0) + 1;
  });
  return summary;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

// Resolves the window to bucket a trend over: an explicit start/end if both
// were given, otherwise the last `fallbackDays` days ending today — used
// only by getPeriodComparison, where "vs. the previous period" needs some
// bounded window to compare against (there's no meaningful "period before
// all time").
const buildDateRange = (startDate, endDate, fallbackDays = 30) => {
  if (startDate && endDate) return { start: new Date(startDate), end: new Date(endDate) };
  const end = new Date();
  const start = new Date(Date.now() - (fallbackDays - 1) * DAY_MS);
  return { start, end };
};

// Same idea, but for the trend charts: when no range is picked, "All time"
// should actually mean all time — the window starts at the earliest case on
// record instead of silently capping at a fixed number of days while still
// being labeled "All time" (that mismatch was confusing: picking "All time"
// looked identical to picking "30d").
const buildTrendDateRange = async (agencyCode, startDate, endDate) => {
  if (startDate && endDate) return { start: new Date(startDate), end: new Date(endDate) };
  const end = new Date();
  const earliest = await getEarliestCaseDate({ agencyCode });
  const start = earliest ? new Date(earliest) : end; // no cases yet — a same-day "range" renders as a single empty point
  return { start, end };
};

// Builds a zero-filled { date, value } series across a range using a getter
// that turns a day's cases into that day's value — shared by the count
// trend and the response-time trend below so the day-bucketing logic only
// exists once.
const buildDailySeries = (cases, start, end, bucketToValue) => {
  const byDay = {};
  cases.forEach((c) => {
    const key = toDateKey(c.createdAt);
    (byDay[key] = byDay[key] || []).push(c);
  });

  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  const dayCount = Math.round((new Date(endKey) - new Date(startKey)) / DAY_MS) + 1;

  const series = [];
  for (let i = 0; i < dayCount; i++) {
    const dateKey = toDateKey(new Date(new Date(startKey).getTime() + i * DAY_MS));
    series.push({ date: dateKey, value: bucketToValue(byDay[dateKey] || []) });
  }
  return series;
};

// Daily case counts, zero-filled so gaps (no cases that day) render as a dip
// on the trend line instead of just vanishing.
export const getCasesTrend = async ({ agencyCode, startDate, endDate } = {}) => {
  const { start, end } = await buildTrendDateRange(agencyCode, startDate, endDate);
  const cases = await getAllCases({ agencyCode, includeAll: true, startDate: toDateKey(start), endDate: toDateKey(end) });
  return buildDailySeries(cases, start, end, (dayCases) => dayCases.length).map((d) => ({ date: d.date, count: d.value }));
};

// Daily average resolution time (minutes) across closed cases — same
// day-bucketing as the trend above, but averaging duration instead of
// counting. Days with no closed cases show as 0, not a break in the line.
export const getResponseTimeTrend = async ({ agencyCode, startDate, endDate } = {}) => {
  const { start, end } = await buildTrendDateRange(agencyCode, startDate, endDate);
  const closedCases = await getAllCases({ agencyCode, status: "closed", startDate: toDateKey(start), endDate: toDateKey(end) });
  return buildDailySeries(closedCases, start, end, (dayCases) => {
    if (dayCases.length === 0) return 0;
    const total = dayCases.reduce((sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)) / 60000, 0);
    return Math.round(total / dayCases.length);
  }).map((d) => ({ date: d.date, avgMinutes: d.value }));
};

// Total cases and average response time for the given window vs. the
// immediately-prior window of equal length — powers the "+/-X% vs last
// period" badges on the Reports page's KPI tiles.
export const getPeriodComparison = async ({ agencyCode, startDate, endDate } = {}) => {
  const { start, end } = buildDateRange(startDate, endDate, 30);
  const rangeMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - DAY_MS);
  const prevStart = new Date(prevEnd.getTime() - rangeMs);

  const fetchStats = async (rangeStart, rangeEnd) => {
    const cases = await getAllCases({
      agencyCode,
      includeAll: true,
      startDate: toDateKey(rangeStart),
      endDate: toDateKey(rangeEnd),
    });
    const closed = cases.filter((c) => c.status === "closed");
    const avgResponseMinutes = closed.length
      ? Math.round(closed.reduce((sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)) / 60000, 0) / closed.length)
      : 0;
    return { totalCases: cases.length, avgResponseMinutes };
  };

  const [current, previous] = await Promise.all([fetchStats(start, end), fetchStats(prevStart, prevEnd)]);

  const pctChange = (curr, prev) => (prev === 0 ? null : Math.round(((curr - prev) / prev) * 100));

  return {
    current,
    previous,
    deltaPct: {
      totalCases: pctChange(current.totalCases, previous.totalCases),
      avgResponseMinutes: pctChange(current.avgResponseMinutes, previous.avgResponseMinutes),
    },
  };
};

// Case volume bucketed by hour of day (0-23), zero-filled so quiet hours
// still show as an empty cell instead of just being absent.
export const getCasesByHour = async ({ agencyCode, startDate, endDate } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true, startDate, endDate });
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
export const getPriorityByAgency = async ({ agencyCode, startDate, endDate } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true, startDate, endDate });
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
export const getAverageResponseTime = async ({ agencyCode, startDate, endDate } = {}) => {
  const closedCases = await getAllCases({ agencyCode, status: "closed", startDate, endDate });
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

const formatHourLabel = (hour) => {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

// Returns the range and its duration as two separate pieces — Date Range
// and Duration get their own rows in the sheet rather than one run-on line.
const formatDateRangeLabel = (startDate, endDate) => {
  const dayCount = Math.round((new Date(endDate) - new Date(startDate)) / DAY_MS) + 1;
  const durationLabel = `${dayCount} ${dayCount === 1 ? "day" : "days"}`;
  const dateRangeLabel = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
  return { dateRangeLabel, durationLabel };
};

// "All Time" on its own doesn't tell a reader what was actually included —
// this resolves it to the real span (earliest case on record through
// today) so every export always states an actual date range, never a
// vague placeholder.
const resolveDateRangeLabel = async (agencyCode, startDate, endDate) => {
  if (startDate && endDate) return formatDateRangeLabel(startDate, endDate);
  const earliest = await getEarliestCaseDate({ agencyCode });
  const todayKey = toDateKey(new Date());
  const startKey = earliest ? toDateKey(earliest) : todayKey;
  return formatDateRangeLabel(startKey, todayKey);
};

// Same border/fill colors as the app's own --line/--surface-2 tokens, so the
// sheet reads as "this app's report", not a generic spreadsheet.
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

const formatGeneratedAt = () =>
  new Date().toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Print-only footer (bottom-center, repeats on every printed page) — kept
// alongside the visible "Generated:" row added to each sheet below, not
// instead of it, since a reader just scrolling the file in normal view
// would never open Print Preview to find it.
const stampGeneratedFooter = (workbook, generatedAt) => {
  workbook.eachSheet((sheet) => {
    sheet.headerFooter.oddFooter = `&C&9&IGenerated: ${generatedAt}`;
  });
};

// One titled, bordered label/value sheet with a Total row — the same shape
// as the frontend's per-chart Excel export (chartExport.js), just built
// server-side so the "export full report" workbook can bundle every
// section as its own sheet without duplicating this layout each time.
const addSummarySheet = (workbook, { sheetName, title, agencyCode, dateRangeLabel, durationLabel, generatedAt, labelHeader, rows }) => {
  const sheet = workbook.addWorksheet(sheetName);

  const longestLabel = Math.max(labelHeader.length, ...rows.map((r) => String(r.label).length));
  sheet.columns = [
    { key: "label", width: Math.min(Math.max(longestLabel + 4, 16), 40) },
    { key: "value", width: 14 },
  ];

  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: "center" };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 2);

  sheet.addRow([]);
  const agencyRow = sheet.addRow(["Agency:", agencyCode || "All Agencies"]);
  agencyRow.getCell(1).font = { bold: true };
  const dateRow = sheet.addRow(["Date Range:", dateRangeLabel]);
  dateRow.getCell(1).font = { bold: true };
  if (durationLabel) {
    const durationRow = sheet.addRow(["Duration:", durationLabel]);
    durationRow.getCell(1).font = { bold: true };
  }
  sheet.addRow([]);

  const headerRow = sheet.addRow([labelHeader, "Count"]);
  styleHeaderRow(headerRow);

  rows.forEach((r) => {
    const row = sheet.addRow({ label: r.label, value: r.value });
    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  });

  const total = rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  const totalRow = sheet.addRow(["Total", total]);
  totalRow.font = { bold: true };
  totalRow.getCell(2).alignment = { horizontal: "right" };
  totalRow.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });

  // A plain grey timestamp below the table, not bundled into the
  // Agency/Date Range scope block up top — it's metadata about the
  // export itself, not one of the filters that shaped what's in it.
  if (generatedAt) {
    sheet.addRow([]);
    const generatedRow = sheet.addRow([`Generated: ${generatedAt}`]);
    generatedRow.font = { italic: true, size: 10, color: { argb: "FF666666" } };
  }

  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  return sheet;
};

// The full case listing + summary block, shared by the standalone Case
// History export and the "export full report" workbook's Case History
// sheet, so the two never drift out of sync with each other.
const buildCaseHistorySheet = (workbook, { sheetName, agencyCode, status, dateRangeLabel, durationLabel, generatedAt, cases, search, category, priority }) => {
  const sheet = workbook.addWorksheet(sheetName);

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
  // it reads as a short, scannable fact sheet rather than a caption. Every
  // active filter gets its own row — search/category/priority only appear
  // when actually set, so a plain unfiltered export doesn't show clutter.
  const addScopeRow = (label, value) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    return row;
  };
  addScopeRow("Agency:", agencyCode || "All Agencies");
  addScopeRow("Date Range:", dateRangeLabel);
  if (durationLabel) addScopeRow("Duration:", durationLabel);
  addScopeRow("Status:", status ? capitalize(status) : "All");
  if (search) addScopeRow("Search:", search);
  if (category) addScopeRow("Category:", capitalize(category));
  if (priority) addScopeRow("Priority:", capitalize(priority));

  sheet.addRow([]); // spacer before the table

  const headerRow = sheet.addRow(["Case ID", "Agency", "Category", "Priority", "Status", "Location", "Created", "Resolved In"]);
  const HEADER_ROW = headerRow.number;
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

  // A plain grey timestamp below everything else, not bundled into the
  // Agency/Date Range/Status scope block up top — it's metadata about the
  // export itself, not one of the filters that shaped what's in it.
  if (generatedAt) {
    sheet.addRow([]);
    const generatedRow = sheet.addRow([`Generated: ${generatedAt}`]);
    generatedRow.font = { italic: true, size: 10, color: { argb: "FF666666" } };
  }

  return sheet;
};

export const generateCasesExcel = async ({ agencyCode, status, startDate, endDate, search, category, priority } = {}) => {
  const [cases, { dateRangeLabel, durationLabel }] = await Promise.all([
    getAllCases({ agencyCode, status, includeAll: true, startDate, endDate, search, category, priority }),
    resolveDateRangeLabel(agencyCode, startDate, endDate),
  ]);
  const generatedAt = formatGeneratedAt();
  const workbook = new ExcelJS.Workbook();
  buildCaseHistorySheet(workbook, {
    sheetName: "Cases",
    agencyCode,
    status,
    dateRangeLabel,
    durationLabel,
    generatedAt,
    cases,
    search,
    category,
    priority,
  });
  // A page footer (Excel's own, via headerFooter) only ever shows up in
  // Print Preview / on the printed page itself, so it repeats on every
  // printed page — the visible "Generated:" row above is what a reader
  // actually sees while just scrolling the file normally.
  stampGeneratedFooter(workbook, generatedAt);
  return workbook.xlsx.writeBuffer();
};

// Bundles every Reports page section into one workbook — one sheet per
// chart plus the Case History table — so "download everything" doesn't
// mean clicking Export on 8 different panels one at a time.
export const generateFullReportExcel = async ({ agencyCode, startDate, endDate, isSuperAdmin } = {}) => {
  const { dateRangeLabel, durationLabel } = await resolveDateRangeLabel(agencyCode, startDate, endDate);
  const generatedAt = formatGeneratedAt();
  const scope = { agencyCode, dateRangeLabel, durationLabel, generatedAt };

  const [statusSummary, prioritySummary, categorySummary, vehicleSummary, hourCells, trend, responseTimeTrend] = await Promise.all([
    getCasesSummaryByStatus({ agencyCode, startDate, endDate }),
    getCasesSummaryByPriority({ agencyCode, startDate, endDate }),
    getCasesSummaryByCategory({ agencyCode, startDate, endDate }),
    getVehicleUtilization({ agencyCode }),
    getCasesByHour({ agencyCode, startDate, endDate }),
    getCasesTrend({ agencyCode, startDate, endDate }),
    getResponseTimeTrend({ agencyCode, startDate, endDate }),
  ]);

  const workbook = new ExcelJS.Workbook();

  addSummarySheet(workbook, {
    sheetName: "Cases by Status",
    title: "Cases by Status",
    ...scope,
    labelHeader: "Status",
    rows: Object.entries(statusSummary).map(([label, value]) => ({ label: capitalize(label), value })),
  });
  addSummarySheet(workbook, {
    sheetName: "Cases by Priority",
    title: "Cases by Priority",
    ...scope,
    labelHeader: "Priority",
    rows: Object.entries(prioritySummary).map(([label, value]) => ({ label: capitalize(label), value })),
  });
  addSummarySheet(workbook, {
    sheetName: "Cases by Category",
    title: "Cases by Category",
    ...scope,
    labelHeader: "Category",
    rows: Object.entries(categorySummary).map(([label, value]) => ({ label: capitalize(label), value })),
  });
  addSummarySheet(workbook, {
    sheetName: "Vehicle Utilization",
    title: "Vehicle Utilization",
    agencyCode,
    dateRangeLabel: "Current (live snapshot)",
    generatedAt,
    labelHeader: "Status",
    rows: Object.entries(vehicleSummary).map(([label, value]) => ({ label: capitalize(label), value })),
  });
  addSummarySheet(workbook, {
    sheetName: "Cases by Hour",
    title: "Cases by Hour of Day",
    ...scope,
    labelHeader: "Hour",
    rows: hourCells.map((c) => ({ label: formatHourLabel(c.hour), value: c.count })),
  });
  addSummarySheet(workbook, {
    sheetName: "Cases Trend",
    title: "Cases Trend",
    ...scope,
    labelHeader: "Date",
    rows: trend.map((t) => ({ label: t.date, value: t.count })),
  });
  addSummarySheet(workbook, {
    sheetName: "Response Time Trend",
    title: "Response Time Trend (minutes)",
    ...scope,
    labelHeader: "Date",
    rows: responseTimeTrend.map((t) => ({ label: t.date, value: t.avgMinutes })),
  });

  if (isSuperAdmin) {
    const [agencySummary, priorityByAgency] = await Promise.all([
      getCasesSummaryByAgency({ agencyCode, startDate, endDate }),
      getPriorityByAgency({ agencyCode, startDate, endDate }),
    ]);
    addSummarySheet(workbook, {
      sheetName: "Cases by Agency",
      title: "Cases by Agency",
      ...scope,
      labelHeader: "Agency",
      rows: Object.entries(agencySummary).map(([label, value]) => ({ label, value })),
    });
    const priorityByAgencyRows = Object.entries(priorityByAgency).flatMap(([agency, mix]) =>
      ["low", "medium", "high"].map((p) => ({ label: `${agency} · ${capitalize(p)}`, value: mix[p] || 0 }))
    );
    addSummarySheet(workbook, {
      sheetName: "Priority by Agency",
      title: "Priority Mix by Agency",
      ...scope,
      labelHeader: "Agency · Priority",
      rows: priorityByAgencyRows,
    });
  }

  // Case History — closed cases only, same convention as the standalone
  // Case History export.
  const cases = await getAllCases({ agencyCode, status: "closed", includeAll: true, startDate, endDate });
  buildCaseHistorySheet(workbook, { sheetName: "Case History", agencyCode, status: "closed", dateRangeLabel, durationLabel, generatedAt, cases });

  stampGeneratedFooter(workbook, generatedAt);
  return workbook.xlsx.writeBuffer();
};
