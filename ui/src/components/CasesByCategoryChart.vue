<template>
  <div>
    <div class="flex justify-end gap-2 mb-2">
      <button @click="handleDownloadImage" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600 cursor-pointer">📷 PNG</button>
      <button @click="handleDownloadCsv" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600 cursor-pointer">📄 CSV</button>
    </div>
    <ErrorBanner v-if="error" :message="error" @retry="loadChart" />
    <LoadingSpinner v-else-if="!chartData" />
    <div v-else class="h-64">
      <Bar ref="chartRef" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";
import { downloadChartImage, downloadChartCsv } from "../utils/chartExport";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const chartData = ref(null);
const chartOptions = { responsive: true, maintainAspectRatio: false, indexAxis: "y" };
const chartRef = ref(null);
const error = ref(null);

// Rotating palette — categories vary per agency, so there's no fixed
// semantic color to map them to like status/priority have.
const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

// With "All Agencies" selected, categories from all 3 agencies combine into
// ~18 distinct values — too many bars to stay readable in a fixed-height
// card, so anything past the top 7 gets folded into "Other".
const TOP_N = 7;

const loadChart = async () => {
  try {
    error.value = null;
    const summary = await reportService.getCasesByCategory(props.agencyCode || undefined);
    const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const restTotal = rest.reduce((sum, [, count]) => sum + count, 0);
    const entries = restTotal > 0 ? [...top, ["Other", restTotal]] : top;

    chartData.value = {
      labels: entries.map(([label]) => label),
      datasets: [
        {
          label: "Cases by Category",
          backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
          data: entries.map(([, count]) => count),
        },
      ],
    };
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

const handleDownloadImage = () => downloadChartImage(chartRef.value?.chart, "cases-by-category");
const handleDownloadCsv = () => downloadChartCsv(chartData.value, "cases-by-category");

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
