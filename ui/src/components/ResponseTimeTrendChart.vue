<template>
  <ChartFrame
    tag="Trend"
    title="Average Response Time"
    :rows="rows"
    :loading="!points && !error"
    :error="error"
    :agency-code="agencyCode"
    :date-range-label="dateRangeLabel"
    filename="response-time-trend"
    label-header="Date"
    @retry="loadChart"
  >
    <p class="text-xs text-gray-500 mb-2">
      How long it takes, on average, to close a case each day — from the moment it's reported to when it's marked closed.
      Dashed line: <span class="font-semibold text-gray-700">{{ SLA_TARGET_MINUTES }}m</span> medium-priority target.
    </p>
    <TrendLine :points="trendPoints" :reference-value="SLA_TARGET_MINUTES" />
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

// Confirmed defaults: High 15m / Medium 30m / Low 60m. The trend itself is
// a blended overall average across priorities, so the medium threshold —
// the middle tier — stands in as the single reference line rather than
// picking one extreme.
const SLA_TARGET_MINUTES = 30;

const points = ref(null);
const error = ref("");

const rows = computed(() => (points.value || []).map((p) => ({ label: p.date, value: p.avgMinutes })));
const trendPoints = computed(() => (points.value || []).map((p) => ({ date: p.date, value: p.avgMinutes })));

const loadChart = async () => {
  try {
    error.value = "";
    points.value = await reportService.getResponseTimeTrend(props.agencyCode || undefined, {
      startDate: props.startDate,
      endDate: props.endDate,
    });
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

watch([() => props.agencyCode, () => props.startDate, () => props.endDate], loadChart);
onMounted(loadChart);
</script>
