<template>
  <LoadingSpinner v-if="!chartData" />
  <Doughnut v-else :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";

ChartJS.register(Title, Tooltip, Legend, ArcElement);

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const chartData = ref(null);
const chartOptions = { responsive: true };

const STATUS_COLORS = {
  available: "#16a34a",
  dispatched: "#eab308",
  en_route: "#ea580c",
  busy: "#2563eb",
  offline: "#6b7280",
};

const loadChart = async () => {
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
};

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
