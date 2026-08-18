<template>
  <ErrorBanner v-if="error" :message="error" @retry="loadData" />
  <LoadingSpinner v-else-if="!data" />
  <div v-else class="rb-kpi-strip">
    <div class="rb-kpi-tile">
      <span class="rb-kpi-led"></span>
      <span class="rb-kpi-label">Overall Avg. Response</span>
      <span class="rb-kpi-value tabular">{{ formatDuration(data.overallMinutes) }}</span>
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

const loadData = async () => {
  try {
    error.value = null;
    const [responseTime, priorityBreakdown] = await Promise.all([
      reportService.getResponseTime(props.agencyCode || undefined),
      reportService.getCasesByPriority(props.agencyCode || undefined),
    ]);
    data.value = responseTime;
    priorityCounts.value = priorityBreakdown;
  } catch (err) {
    error.value = "Failed to load response time data.";
  }
};

const countFor = (priority) => priorityCounts.value[priority] || 0;

watch(() => props.agencyCode, loadData);
onMounted(loadData);
</script>
