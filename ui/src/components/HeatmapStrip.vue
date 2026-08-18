<template>
  <div class="rb-heatmap">
    <div class="rb-heatmap-grid">
      <div
        v-for="cell in cells"
        :key="cell.hour"
        class="rb-heatmap-cell"
        :style="{ background: cellColor(cell.count) }"
        :title="`${formatHour(cell.hour)}: ${cell.count} case${cell.count === 1 ? '' : 's'}`"
      >
        <span v-if="cell.hour % 6 === 0" class="rb-heatmap-hour">{{ formatHour(cell.hour) }}</span>
      </div>
    </div>
    <div class="rb-heatmap-legend">
      <span>Quieter</span>
      <span class="rb-heatmap-scale">
        <span v-for="i in 5" :key="i" class="rb-heatmap-swatch" :style="{ background: cellColor((i / 5) * maxValue) }"></span>
      </span>
      <span>Busier</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  cells: { type: Array, required: true }, // [{ hour: 0-23, count }]
});

const maxValue = computed(() => Math.max(1, ...props.cells.map((c) => c.count)));

// Zero stays the bare track color; anything above zero gets a floor so a
// single case at 4am doesn't render visually identical to a dead hour.
const cellColor = (count) => {
  if (count <= 0) return "var(--surface-2)";
  const pct = Math.max(18, Math.round((count / maxValue.value) * 100));
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--surface-2))`;
};

const formatHour = (hour) => {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
};
</script>
