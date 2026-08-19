<template>
  <ChartFrame
    tag="Distribution"
    title="Cases by Priority"
    :rows="rows"
    :loading="!rows && !error"
    :error="error"
    :agency-code="agencyCode"
    :date-range-label="dateRangeLabel"
    filename="cases-by-priority"
    label-header="Priority"
    @retry="loadChart"
  >
    <BarChartXY :rows="rows" clickable @row-click="(row) => $emit('segment-click', { type: 'priority', value: row.label.toLowerCase() })" />
  </ChartFrame>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import BarChartXY from "./BarChartXY.vue";
import ChartFrame from "./ChartFrame.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  dateRangeLabel: { type: String, default: null },
});
defineEmits(["segment-click"]);

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
    const summary = await reportService.getCasesByPriority(props.agencyCode || undefined, {
      startDate: props.startDate,
      endDate: props.endDate,
    });
    rows.value = PRIORITY_ORDER.filter((p) => summary[p.key] !== undefined).map((p) => ({
      label: p.label,
      value: summary[p.key] || 0,
      color: p.color,
    }));
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

watch([() => props.agencyCode, () => props.startDate, () => props.endDate], loadChart);
onMounted(loadChart);
</script>
