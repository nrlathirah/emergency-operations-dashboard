<template>
  <LoadingSpinner v-if="!chartData" />
  <Bar v-else :data="chartData" :options="chartOptions" />
</template>


<script setup>
import { ref, watch, onMounted } from "vue";
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const chartData = ref(null);
const chartOptions = { responsive: true };

const AGENCY_COLORS = { KKM: "#dc2626", PDRM: "#1e3a8a", JBPM: "#f59e0b" };

const loadChart = async () => {
  const summary = await reportService.getCasesByAgency(props.agencyCode || undefined);
  const labels = Object.keys(summary);
  chartData.value = {
    labels,
    datasets: [
      {
        label: "Cases by Agency",
        backgroundColor: labels.map((l) => AGENCY_COLORS[l] || "#6b7280"),
        data: Object.values(summary),
      },
    ],
  };
};

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
