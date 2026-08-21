<template>
  <ChartFrame
    title="Vehicle Utilization"
    :rows="segments"
    :loading="!segments && !error"
    :error="error"
    :agency-code="agencyCode"
    date-range-label="Current (live snapshot)"
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
  // Accepted but intentionally unused: vehicle status is a live fleet
  // snapshot with no date dimension, so this chart always overrides
  // ChartFrame's date-range-label with its own literal "Current (live
  // snapshot)" below. Declaring these three still matters, though — without
  // them Vue's attribute fallthrough would pass the Reports page's actual
  // startDate/endDate/dateRangeLabel straight onto ChartFrame's root and
  // silently override that literal.
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  dateRangeLabel: { type: String, default: null },
});

const STATUS_ORDER = [
  { key: "available", label: "Available", color: "var(--veh-available)" },
  { key: "dispatched", label: "Dispatched", color: "var(--veh-dispatched)" },
  { key: "en_route", label: "En Route", color: "var(--veh-enroute)" },
  { key: "busy", label: "Busy", color: "var(--veh-busy)" },
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
