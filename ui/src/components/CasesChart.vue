<template>
  <div>
    <div class="flex justify-end gap-2 mb-2">
      <button @click="handleDownloadImage" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600">📷 PNG</button>
      <button @click="handleDownloadCsv" class="px-2 py-1 text-xs border rounded hover:bg-gray-50 text-gray-600">📄 CSV</button>
    </div>
    <LoadingSpinner v-if="!chartData" />
    <Bar v-else ref="chartRef" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";
import { downloadChartImage, downloadChartCsv } from "../utils/chartExport";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const chartData = ref(null);
const chartOptions = { responsive: true };
const chartRef = ref(null);

const loadChart = async () => {
  const summary = await reportService.getCasesSummary(props.agencyCode || undefined);
  chartData.value = {
    labels: Object.keys(summary),
    datasets: [
      {
        label: "Cases by Status",
        backgroundColor: "#42A5F5",
        data: Object.values(summary),
      },
    ],
  };
};

const handleDownloadImage = () => downloadChartImage(chartRef.value?.chart, "cases-by-status");
const handleDownloadCsv = () => downloadChartCsv(chartData.value, "cases-by-status");

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
