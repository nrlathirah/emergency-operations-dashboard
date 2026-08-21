<template>
  <ErrorBanner v-if="error" :message="error" @retry="loadData" />
  <LoadingSpinner v-else-if="!data" />
  <div v-else class="rb-kpi-strip">
    <div class="rb-kpi-tile">
      <span class="rb-kpi-led"></span>
      <span class="rb-kpi-label">Overall Avg. Response</span>
      <div class="rb-kpi-delta-row">
        <span class="rb-kpi-value tabular">{{ formatDuration(displayed.overall) }}</span>
        <span v-if="responseDelta !== null" class="rb-delta-badge" :class="deltaClass(responseDelta, true)">{{ formatDelta(responseDelta) }}</span>
      </div>
      <span class="rb-kpi-sub tabular">{{ data.sampleSize }} closed case{{ data.sampleSize === 1 ? "" : "s" }}</span>
    </div>
    <div v-for="priority in ['high', 'medium', 'low']" :key="priority" class="rb-kpi-tile" :data-priority="priority">
      <span class="rb-kpi-led"></span>
      <span class="rb-kpi-label capitalize">{{ priority }} Priority</span>
      <span class="rb-kpi-value tabular">{{ formatDuration(displayed[priority]) }}</span>
      <span class="rb-kpi-sub tabular">{{ countFor(priority) }} case{{ countFor(priority) === 1 ? "" : "s" }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from "vue";
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

// Animated minutes shown in each tile — counts up from whatever was showing
// before (0 on first load) to the freshly fetched value, rather than the
// number just snapping to its new figure on every filter/date-range change.
const displayed = reactive({ overall: 0, high: 0, medium: 0, low: 0 });
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeOutQuad = (t) => t * (2 - t);
let rafId = null;

const animateDisplayed = (targets) => {
  if (reduceMotion) {
    Object.assign(displayed, targets);
    return;
  }
  cancelAnimationFrame(rafId);
  const from = { ...displayed };
  const startTime = performance.now();
  const DURATION = 600;
  const step = (now) => {
    const t = Math.min(1, (now - startTime) / DURATION);
    const eased = easeOutQuad(t);
    for (const key in targets) {
      displayed[key] = Math.round(from[key] + (targets[key] - from[key]) * eased);
    }
    if (t < 1) rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
};

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
    animateDisplayed({
      overall: responseTime.overallMinutes || 0,
      high: responseTime.byPriorityMinutes.high || 0,
      medium: responseTime.byPriorityMinutes.medium || 0,
      low: responseTime.byPriorityMinutes.low || 0,
    });
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
onUnmounted(() => cancelAnimationFrame(rafId));
</script>
