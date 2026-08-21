// exceljs is a large library (spreadsheet generation) that only ever runs
// when someone actually clicks an "Export to Excel" button — importing it
// statically here would put its full weight in every page's initial bundle
// for every visitor, whether they ever export anything or not. Loaded
// on-demand instead, inside downloadRowsExcel below.

// e.g. "emergency-ops-cases-by-status-2026-08-18-1432.png" — branded and
// timestamped (not just dated) so repeated downloads on the same day get
// distinct filenames instead of the browser silently reusing/renaming an
// older file with the same name. Shared by every download button (chart
// image, chart Excel, Case History Excel) so they all read the same way.
export const buildTimestampedFilename = (base, extension) => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `emergency-ops-${base}-${date}-${time}.${extension}`;
};

// e.g. "2026-07-21 to 2026-08-19 (30 days)", or "2026-08-19 (1 day)" for a
// single day — a plain "to"-range never says how long it actually spans,
// so every export/print states both ends AND the duration explicitly.
export const formatDateRangeLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const dayCount = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000) + 1;
  const dayWord = dayCount === 1 ? "day" : "days";
  return startDate === endDate ? `${startDate} (${dayCount} ${dayWord})` : `${startDate} to ${endDate} (${dayCount} ${dayWord})`;
};

// Splits a formatDateRangeLabel() string back into its two parts for Excel,
// where date and duration get their own rows instead of one run-on line.
// Regex, not fragile screen-scraping — this only ever parses a string this
// same module produced, in a format only it controls. A label with no
// "(N days)" suffix (e.g. Vehicle Utilization's "Current (live snapshot)")
// has no separate duration, so it's returned as-is with none.
export const splitDateRangeLabel = (label) => {
  if (!label) return { dateRangeLabel: null, durationLabel: null };
  const match = label.match(/^(.*) \((\d+ days?)\)$/);
  return match ? { dateRangeLabel: match[1], durationLabel: match[2] } : { dateRangeLabel: label, durationLabel: null };
};

// Same border/fill colors as the app's own --line/--surface-2 tokens, so
// the sheet reads as "this app's report" rather than a generic spreadsheet.
const BORDER_COLOR = "FFD8E3E0";
const HEADER_FILL = "FFE7EFED";
const THIN_BORDER = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

// Builds and downloads a titled, styled .xlsx for a chart's label/value
// breakdown — used by the Reports page's bar-list, donut and trend
// components (all hand-drawn SVG/CSS, no canvas to export as an image
// from). Mirrors the same title/agency/generated-time header block and
// bold/shaded header row as the backend's Case History export, so every
// "Export to Excel" button in the app behaves the same way instead of this
// one quietly producing a bare, unstyled CSV.
export const downloadRowsExcel = async (rows, fullFilename, { title, agencyLabel, dateRangeLabel, durationLabel, generatedAt, labelHeader = "Label" } = {}) => {
  if (!rows || rows.length === 0) return;

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");

  // Only 2 columns here (unlike the 7-8 column Case History sheet), so a
  // merged A:B title row is easily narrower than the title text itself —
  // widen column A to whatever the title needs so it renders on one line
  // instead of getting clipped the instant the file opens.
  const titleText = title || "Chart Export";
  const longestLabel = Math.max(labelHeader.length, ...rows.map((r) => String(r.label).length));
  const labelColWidth = Math.min(Math.max(longestLabel + 4, 16), 40);
  const valueColWidth = 14;
  const titleColWidth = Math.max(labelColWidth, titleText.length + 4 - valueColWidth);
  sheet.columns = [
    { key: "label", width: titleColWidth },
    { key: "value", width: valueColWidth },
  ];

  const titleRow = sheet.addRow([titleText]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: "center" };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 2);

  sheet.addRow([]); // spacer — keeps the scope row from crowding the title

  // Scope shown as separate label/value cells (not a run-on sentence) so
  // it reads as a short, scannable fact rather than a caption.
  if (agencyLabel) {
    const agencyRow = sheet.addRow(["Agency:", agencyLabel]);
    agencyRow.getCell(1).font = { bold: true };
  }
  if (dateRangeLabel) {
    const dateRow = sheet.addRow(["Date Range:", dateRangeLabel]);
    dateRow.getCell(1).font = { bold: true };
  }
  if (durationLabel) {
    const durationRow = sheet.addRow(["Duration:", durationLabel]);
    durationRow.getCell(1).font = { bold: true };
  }

  sheet.addRow([]); // spacer before the table

  const headerRow = sheet.addRow([labelHeader, "Count"]);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = THIN_BORDER;
  });

  rows.forEach((r) => {
    const row = sheet.addRow({ label: r.label, value: r.value });
    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  });

  // Every chart's export is a label/count breakdown, so the count column
  // always sums to something meaningful (total cases, total vehicles,
  // etc.) — a bold Total row saves reaching for a calculator.
  const total = rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  const totalRow = sheet.addRow(["Total", total]);
  totalRow.font = { bold: true };
  totalRow.getCell(2).alignment = { horizontal: "right" };
  totalRow.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });

  // Filter dropdown arrows already active on open — no manual "Data > Filter" step.
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number + rows.length, column: 2 },
  };
  // Keep the title/agency info and header row visible while scrolling.
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];

  if (generatedAt) {
    // A plain grey timestamp below the table, not bundled into the
    // Agency/Date Range scope block up top — it's metadata about the
    // export itself, not one of the filters that shaped what's in it.
    // Excluded from the print area (below) since the page footer already
    // shows the same "Generated:" text on the printed page — showing both
    // would duplicate it.
    sheet.pageSetup.printArea = `A1:B${totalRow.number}`;
    sheet.addRow([]);
    const generatedRow = sheet.addRow([`Generated: ${generatedAt}`]);
    generatedRow.font = { italic: true, size: 10, color: { argb: "FF666666" } };
    // Also as a page footer (Excel's own, via headerFooter) — that only
    // ever shows up in Print Preview / on the printed page, repeating
    // bottom-center on every page, which the row above can't do.
    sheet.headerFooter.oddFooter = `&C&9&IGenerated: ${generatedAt}`;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fullFilename;
  link.click();
  URL.revokeObjectURL(url);
};
