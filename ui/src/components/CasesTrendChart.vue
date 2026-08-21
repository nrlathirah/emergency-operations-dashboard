<template>
  <ChartFrame
    title="Cases Reported"
    :rows="rows"
    :loading="!points && !error"
    :error="error"
    :agency-code="agencyCode"
    :date-range-label="dateRangeLabel"
    filename="cases-trend"
    label-header="Date"
    @retry="loadChart"
  >
    <p v-if="peakInfo" class="text-xs text-gray-500 mb-2">Peak: <span class="font-semibold text-gray-700">{{ peakInfo.count }}</span> on {{ peakInfo.dateLabel }}</p>
    <TrendLine :points="trendPoints" />
  </ChartFrame>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import TrendLine from "./TrendLine.vue";
import ChartFrame from "./ChartFrame.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  dateRangeLabel: { type: String, default: null },
});

const points = ref(null);
const error = ref("");

const rows = computed(() => (points.value || []).map((p) => ({ label: p.date, value: p.count })));
const trendPoints = computed(() => (points.value || []).map((p) => ({ date: p.date, value: p.count })));

const loadChart = async () => {
  try {
    error.value = "";
    points.value = await reportService.getCasesTrend(props.agencyCode || undefined, {
      startDate: props.startDate,
      endDate: props.endDate,
    });
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

const peakInfo = computed(() => {
  if (!points.value || points.value.length === 0) return null;
  const peak = points.value.reduce((max, p) => (p.count > max.count ? p : max), points.value[0]);
  const dateLabel = new Date(`${peak.date}T00:00:00`).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
  return { count: peak.count, dateLabel };
});

watch([() => props.agencyCode, () => props.startDate, () => props.endDate], loadChart);
onMounted(loadChart);
</script>
