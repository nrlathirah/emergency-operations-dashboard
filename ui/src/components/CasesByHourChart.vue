<template>
  <ChartFrame
    tag="Timing"
    title="Cases by Hour of Day"
    :rows="rows"
    :loading="!cells && !error"
    :error="error"
    :agency-code="agencyCode"
    filename="cases-by-hour"
    label-header="Hour"
    @retry="loadChart"
  >
    <HeatmapStrip :cells="cells" />
  </ChartFrame>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import HeatmapStrip from "./HeatmapStrip.vue";
import ChartFrame from "./ChartFrame.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
});

const cells = ref(null);
const error = ref("");

const formatHour = (hour) => {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
};

const rows = computed(() => (cells.value || []).map((c) => ({ label: formatHour(c.hour), value: c.count })));

const loadChart = async () => {
  try {
    error.value = "";
    cells.value = await reportService.getCasesByHour(props.agencyCode || undefined);
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

watch(() => props.agencyCode, loadChart);
onMounted(loadChart);
</script>
