<template>
  <ChartFrame
    tag="Distribution"
    title="Cases by Priority"
    :rows="rows"
    :loading="!rows && !error"
    :error="error"
    :agency-code="agencyCode"
    filename="cases-by-priority"
    label-header="Priority"
    @retry="loadChart"
  >
    <BarChartXY :rows="rows" />
  </ChartFrame>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import BarChartXY from "./BarChartXY.vue";
import ChartFrame from "./ChartFrame.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const PRIORITY_ORDER = [
  { key: "low", label: "Low", color: "var(--pri-low)" },
  { key: "medium", label: "Medium", color: "var(--pri-med)" },
  { key: "high", label: "High", color: "var(--pri-high)" },
];

const rows = ref(null);
const error = ref("");

const loadChart = async () => {
  try {
    error.value = "";
    const summary = await reportService.getCasesByPriority(props.agencyCode || undefined);
    rows.value = PRIORITY_ORDER.filter((p) => summary[p.key] !== undefined).map((p) => ({
      label: p.label,
      value: summary[p.key] || 0,
      color: p.color,
    }));
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
