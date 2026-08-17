<template>
  <div>
    <div class="flex justify-end gap-2 mb-2">
      <button @click="handleDownloadImage" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600 cursor-pointer">📷 PNG</button>
      <button @click="handleDownloadCsv" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600 cursor-pointer">📄 CSV</button>
    </div>
    <ErrorBanner v-if="error" :message="error" @retry="loadChart" />
    <LoadingSpinner v-else-if="!chartData" />
    <Line v-else ref="chartRef" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { Line } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale } from "chart.js";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";
import { downloadChartImage, downloadChartCsv } from "../utils/chartExport";

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale);

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const chartData = ref(null);
const chartOptions = { responsive: true, plugins: { legend: { display: false } } };
const chartRef = ref(null);
const error = ref(null);

const loadChart = async () => {
  try {
    error.value = null;
    const trend = await reportService.getCasesTrend(props.agencyCode || undefined, 30);
    chartData.value = {
      labels: trend.map((t) => t.date.slice(5)), // MM-DD
      datasets: [
        {
          label: "Cases per Day",
          borderColor: "#0d9488",
          backgroundColor: "#0d9488",
          data: trend.map((t) => t.count),
          tension: 0.3,
        },
      ],
    };
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

const handleDownloadImage = () => downloadChartImage(chartRef.value?.chart, "cases-trend");
const handleDownloadCsv = () => downloadChartCsv(chartData.value, "cases-trend");

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
