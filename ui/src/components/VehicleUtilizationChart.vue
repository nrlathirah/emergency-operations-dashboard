<template>
  <div>
    <div class="flex justify-end gap-2 mb-2">
      <button @click="handleDownloadImage" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600 cursor-pointer">📷 PNG</button>
      <button @click="handleDownloadCsv" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600 cursor-pointer">📄 CSV</button>
    </div>
    <ErrorBanner v-if="error" :message="error" @retry="loadChart" />
    <LoadingSpinner v-else-if="!chartData" />
    <Doughnut v-else ref="chartRef" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";
import { downloadChartImage, downloadChartCsv } from "../utils/chartExport";

ChartJS.register(Title, Tooltip, Legend, ArcElement);

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const chartData = ref(null);
const chartOptions = { responsive: true };
const chartRef = ref(null);
const error = ref(null);

const STATUS_COLORS = {
  available: "#16a34a",
  dispatched: "#eab308",
  en_route: "#ea580c",
  busy: "#2563eb",
  offline: "#6b7280",
};

const loadChart = async () => {
  try {
    error.value = null;
    const summary = await reportService.getVehicleUtilization(props.agencyCode || undefined);
    const labels = Object.keys(summary);
    chartData.value = {
      labels,
      datasets: [
        {
          label: "Vehicle Utilization",
          backgroundColor: labels.map((l) => STATUS_COLORS[l] || "#9ca3af"),
          data: Object.values(summary),
        },
      ],
    };
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

const handleDownloadImage = () => downloadChartImage(chartRef.value?.chart, "vehicle-utilization");
const handleDownloadCsv = () => downloadChartCsv(chartData.value, "vehicle-utilization");

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
