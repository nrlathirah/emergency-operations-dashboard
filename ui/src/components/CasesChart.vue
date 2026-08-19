<template>
  <ChartFrame
    tag="Distribution"
    title="Cases by Status"
    :rows="rows"
    :loading="!rows && !error"
    :error="error"
    :agency-code="agencyCode"
    :date-range-label="dateRangeLabel"
    filename="cases-by-status"
    label-header="Status"
    @retry="loadChart"
  >
    <BarList :rows="rows" :caption="caption" />
  </ChartFrame>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import BarList from "./BarList.vue";
import ChartFrame from "./ChartFrame.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  dateRangeLabel: { type: String, default: null },
});

const STATUS_ORDER = [
  { key: "open", label: "Open", color: "var(--stat-open)" },
  { key: "dispatched", label: "Dispatched", color: "var(--stat-dispatched)" },
  { key: "en_route", label: "En Route", color: "var(--stat-enroute)" },
  { key: "on_scene", label: "On Scene", color: "var(--stat-onscene)" },
  { key: "closed", label: "Closed", color: "var(--stat-closed)" },
];

const rows = ref(null);
const caption = ref("");
const error = ref("");

const loadChart = async () => {
  try {
    error.value = "";
    const summary = await reportService.getCasesSummary(props.agencyCode || undefined, {
      startDate: props.startDate,
      endDate: props.endDate,
    });
    rows.value = STATUS_ORDER.filter((s) => summary[s.key] !== undefined).map((s) => ({
      label: s.label,
      value: summary[s.key] || 0,
      color: s.color,
    }));
    const active = (summary.open || 0) + (summary.dispatched || 0) + (summary.en_route || 0) + (summary.on_scene || 0);
    caption.value = `${active} case${active === 1 ? "" : "s"} currently active · ${summary.closed || 0} retained as history`;
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

watch([() => props.agencyCode, () => props.startDate, () => props.endDate], loadChart);
onMounted(loadChart);
</script>
