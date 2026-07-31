export const downloadChartImage = (chartInstance, filename) => {
  if (!chartInstance) return;
  const link = document.createElement("a");
  link.href = chartInstance.toBase64Image();
  link.download = `${filename}.png`;
  link.click();
};

export const downloadChartCsv = (chartData, filename) => {
  if (!chartData) return;
  const labels = chartData.labels;
  const data = chartData.datasets[0].data;
  const rows = [["Label", "Count"], ...labels.map((label, i) => [label, data[i]])];
  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
