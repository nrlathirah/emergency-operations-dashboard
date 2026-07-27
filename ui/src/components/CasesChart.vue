<template>
  <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { reportService } from "../services/reportService";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const chartData = ref(null);
const chartOptions = { responsive: true };

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

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
