<template>
  <ErrorBanner v-if="error" :message="error" @retry="loadData" />
  <LoadingSpinner v-else-if="!data" />
  <div v-else class="rb-kpi-strip">
    <div class="rb-kpi-tile">
      <span class="rb-kpi-led"></span>
      <span class="rb-kpi-label">Overall Avg. Response</span>
      <div class="rb-kpi-delta-row">
        <span class="rb-kpi-value tabular">{{ formatDuration(data.overallMinutes) }}</span>
        <span v-if="responseDelta !== null" class="rb-delta-badge" :class="deltaClass(responseDelta, true)">{{ formatDelta(responseDelta) }}</span>
      </div>
      <span class="rb-kpi-sub tabular">{{ data.sampleSize }} closed case{{ data.sampleSize === 1 ? "" : "s" }}</span>
    </div>
    <div v-for="priority in ['high', 'medium', 'low']" :key="priority" class="rb-kpi-tile" :data-priority="priority">
      <span class="rb-kpi-led"></span>
      <span class="rb-kpi-label capitalize">{{ priority }} Priority</span>
      <span class="rb-kpi-value tabular">{{ formatDuration(data.byPriorityMinutes[priority]) }}</span>
      <span class="rb-kpi-sub tabular">{{ countFor(priority) }} case{{ countFor(priority) === 1 ? "" : "s" }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
});

const data = ref(null);
const error = ref(null);

const formatDuration = (minutes) => {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

// The response-time endpoint returns average minutes per priority but not
// the case count behind each average — priorityCounts fills that in from
// the separate cases-by-priority endpoint so each tile can show both.
const priorityCounts = ref({});
// % change in avg response time vs. the immediately-prior period of equal
// length — null until loaded, or if there's no prior-period data to compare
// against (deltaPct comes back null from the backend in that case too).
const responseDelta = ref(null);

const loadData = async () => {
  try {
    error.value = null;
    const range = { startDate: props.startDate, endDate: props.endDate };
    const [responseTime, priorityBreakdown, comparison] = await Promise.all([
      reportService.getResponseTime(props.agencyCode || undefined, range),
      reportService.getCasesByPriority(props.agencyCode || undefined, range),
      reportService.getPeriodComparison(props.agencyCode || undefined, range),
    ]);
    data.value = responseTime;
    priorityCounts.value = priorityBreakdown;
    responseDelta.value = comparison.deltaPct.avgResponseMinutes;
  } catch (err) {
    error.value = "Failed to load response time data.";
  }
};

const countFor = (priority) => priorityCounts.value[priority] || 0;

const formatDelta = (pct) => `${pct > 0 ? "+" : ""}${pct}% vs last period`;

// For response time, lower is better — a decrease is the "good" direction,
// the opposite of how a plain growth metric would be colored.
const deltaClass = (pct, lowerIsBetter) => {
  if (pct === 0) return "rb-delta-badge--neutral";
  const isImprovement = lowerIsBetter ? pct < 0 : pct > 0;
  return isImprovement ? "rb-delta-badge--up" : "rb-delta-badge--down";
};

watch([() => props.agencyCode, () => props.startDate, () => props.endDate], loadData);
onMounted(loadData);
</script>
