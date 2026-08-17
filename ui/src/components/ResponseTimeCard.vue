<template>
  <ErrorBanner v-if="error" :message="error" @retry="loadData" />
  <LoadingSpinner v-else-if="!data" />
  <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div class="border rounded-lg p-3">
      <p class="text-xs text-gray-500">Overall Avg.</p>
      <p class="text-xl font-semibold text-gray-800">{{ formatDuration(data.overallMinutes) }}</p>
    </div>
    <div v-for="priority in ['high', 'medium', 'low']" :key="priority" class="border rounded-lg p-3">
      <p class="text-xs text-gray-500 capitalize">{{ priority }} Priority</p>
      <p class="text-xl font-semibold" :class="PRIORITY_TEXT_COLORS[priority]">{{ formatDuration(data.byPriorityMinutes[priority]) }}</p>
    </div>
    <p class="col-span-2 sm:col-span-4 text-xs text-gray-400">Based on {{ data.sampleSize }} closed case{{ data.sampleSize === 1 ? "" : "s" }}</p>
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

const PRIORITY_TEXT_COLORS = { low: "text-green-600", medium: "text-amber-600", high: "text-red-600" };

const formatDuration = (minutes) => {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const loadData = async () => {
  try {
    error.value = null;
    data.value = await reportService.getResponseTime(props.agencyCode || undefined);
  } catch (err) {
    error.value = "Failed to load response time data.";
  }
};

watch(() => props.agencyCode, loadData);
onMounted(loadData);
</script>
