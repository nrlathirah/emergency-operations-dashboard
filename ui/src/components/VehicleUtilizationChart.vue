<template>
  <ChartFrame
    tag="Fleet"
    title="Vehicle Utilization"
    :rows="segments"
    :loading="!segments && !error"
    :error="error"
    :agency-code="agencyCode"
    filename="vehicle-utilization"
    label-header="Status"
    @retry="loadChart"
  >
    <DonutChart :segments="segments" center-label="Units" />
  </ChartFrame>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import DonutChart from "./DonutChart.vue";
import ChartFrame from "./ChartFrame.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const STATUS_ORDER = [
  { key: "available", label: "Available", color: "var(--pri-low)" },
  { key: "dispatched", label: "Dispatched", color: "var(--pri-med)" },
  { key: "en_route", label: "En Route", color: "var(--accent)" },
  { key: "busy", label: "Busy", color: "var(--pri-high)" },
];

const segments = ref(null);
const error = ref("");

const loadChart = async () => {
  try {
    error.value = "";
    const summary = await reportService.getVehicleUtilization(props.agencyCode || undefined);
    const known = STATUS_ORDER.filter((s) => summary[s.key] !== undefined).map((s) => ({
      label: s.label,
      value: summary[s.key] || 0,
      color: s.color,
    }));
    const knownKeys = new Set(STATUS_ORDER.map((s) => s.key));
    const extra = Object.keys(summary)
      .filter((k) => !knownKeys.has(k))
      .map((k) => ({ label: k, value: summary[k], color: "var(--muted)" }));
    segments.value = [...known, ...extra];
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
