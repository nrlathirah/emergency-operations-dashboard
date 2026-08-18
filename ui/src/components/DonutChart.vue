<template>
  <div class="rb-donut-wrap">
    <div class="rb-donut" :style="{ background: gradient }">
      <div class="rb-donut-center">
        <strong class="tabular">{{ total }}</strong>
        <span>{{ centerLabel }}</span>
      </div>
    </div>
    <div class="rb-donut-legend">
      <div class="rb-donut-legend-row" v-for="seg in segments" :key="seg.label">
        <span class="rb-dot" :style="{ background: seg.color }"></span>
        <span class="rb-name">{{ seg.label }}</span>
        <span class="rb-val tabular">{{ seg.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  segments: { type: Array, required: true }, // [{ label, value, color }]
  centerLabel: { type: String, default: "Total" },
});

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0));

const gradient = computed(() => {
  if (total.value === 0) return "var(--surface-2)";
  let cursor = 0;
  const stops = props.segments.map((seg) => {
    const start = cursor;
    cursor += (seg.value / total.value) * 100;
    return `${seg.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
});
</script>
