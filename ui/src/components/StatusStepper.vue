<template>
  <div class="flex items-center w-full px-4 py-2">
    <template v-for="(step, index) in steps" :key="step.key">
      <div class="flex flex-col items-center gap-1 flex-shrink-0">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          :style="dotStyle(index)"
        >
          <span v-if="index < currentIndex">✓</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span
          class="text-[11px] whitespace-nowrap"
          :class="index <= currentIndex ? 'text-gray-700 font-medium' : 'text-gray-400'"
        >{{ step.label }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="h-0.5 flex-1 mx-2 -mt-4"
        :style="lineStyle(index)"
      ></div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
  agencyCode: { type: String, default: "" },
});

const AGENCY_COLORS = {
  KKM: { main: "#dc2626", light: "#fecaca" },
  PDRM: { main: "#2563eb", light: "#bfdbfe" },
  JBPM: { main: "#f59e0b", light: "#fde68a" },
};

const colors = computed(() => AGENCY_COLORS[props.agencyCode] || { main: "#475569", light: "#cbd5e1" });

const steps = [
  { key: "open", label: "Reported" },
  { key: "dispatched", label: "Dispatched" },
  { key: "en_route", label: "En Route" },
  { key: "on_scene", label: "On Scene" },
  { key: "closed", label: "Resolved" },
];

const currentIndex = computed(() => steps.findIndex((s) => s.key === props.status));

const dotStyle = (index) => {
  if (index < currentIndex.value) return { backgroundColor: colors.value.main, color: "#fff" };
  if (index === currentIndex.value) {
    return { backgroundColor: colors.value.main, color: "#fff", boxShadow: `0 0 0 4px ${colors.value.light}` };
  }
  return { backgroundColor: "#e5e7eb", color: "#6b7280" };
};

const lineStyle = (index) => ({
  backgroundColor: index < currentIndex.value ? colors.value.main : "#e5e7eb",
});
</script>
