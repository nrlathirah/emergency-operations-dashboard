<template>
  <ChartFrame
    tag="Cross-tab"
    title="Priority Mix by Agency"
    :rows="exportRows"
    :loading="!rows && !error"
    :error="error"
    filename="priority-by-agency"
    label-header="Agency · Priority"
    @retry="loadChart"
  >
    <StackedBarChart :legend="LEGEND" :rows="rows" />
  </ChartFrame>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import StackedBarChart from "./StackedBarChart.vue";
import ChartFrame from "./ChartFrame.vue";

const AGENCY_ORDER = [
  { key: "KKM", color: "var(--kkm)" },
  { key: "PDRM", color: "var(--pdrm)" },
  { key: "JBPM", color: "var(--jbpm)" },
];

const LEGEND = [
  { key: "low", label: "Low", color: "var(--pri-low)" },
  { key: "medium", label: "Medium", color: "var(--pri-med)" },
  { key: "high", label: "High", color: "var(--pri-high)" },
];

const rows = ref(null);
const error = ref("");

const loadChart = async () => {
  try {
    error.value = "";
    const summary = await reportService.getPriorityByAgency();
    rows.value = AGENCY_ORDER.filter((a) => summary[a.key]).map((a) => {
      const mix = summary[a.key];
      const total = mix.low + mix.medium + mix.high;
      return {
        label: a.key,
        color: a.color,
        total,
        segments: LEGEND.map((l) => ({ key: l.key, label: l.label, value: mix[l.key] || 0, color: l.color })),
      };
    });
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

const exportRows = computed(() =>
  (rows.value || []).flatMap((row) => row.segments.map((seg) => ({ label: `${row.label} · ${seg.label}`, value: seg.value })))
);

onMounted(loadChart);
</script>
