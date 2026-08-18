// Downloads a simple label/value breakdown as CSV — used by the Reports
// page's bar-list, donut and trend components (all hand-drawn SVG/CSS, no
// canvas to export as an image from).
export const downloadRowsCsv = (rows, filename) => {
  if (!rows || rows.length === 0) return;
  const csvRows = [["Label", "Count"], ...rows.map((r) => [r.label, r.value])];
  const csvContent = csvRows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
