<template>
  <div class="rb-heatmap">
    <div class="rb-heatmap-grid">
      <!-- Tooltip lives on this wrapper (the actual grid item), not on the
           colored cell inside it — a pseudo-element tooltip inherits its
           own host's transform, so the hover-grow on .rb-heatmap-cell would
           otherwise stretch the tooltip text too. -->
      <div
        v-for="cell in cells"
        :key="cell.hour"
        class="rb-heatmap-cell-wrap rb-tooltip-target"
        :data-tooltip="`${formatHour(cell.hour)}: ${cell.count} case${cell.count === 1 ? '' : 's'}`"
      >
        <div class="rb-heatmap-cell" :style="{ background: cellColor(cell.count), '--glow': cellColor(cell.count) }">
          <span v-if="cell.hour % 6 === 0" class="rb-heatmap-hour">{{ formatHour(cell.hour) }}</span>
        </div>
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

// Interpolated in JS rather than via CSS color-mix() — html2canvas (used for
// the chart image download/print) can't parse color-mix() and throws,
// silently failing the whole capture rather than just rendering it wrong.
const ACCENT_RGB = [12, 110, 114]; // --accent, #0C6E72
const TRACK_RGB = [231, 239, 237]; // --surface-2, #E7EFED

// Zero stays the bare track color; anything above zero gets a floor so a
// single case at 4am doesn't render visually identical to a dead hour.
const cellColor = (count) => {
  if (count <= 0) return "var(--surface-2)";
  const pct = Math.max(18, Math.round((count / maxValue.value) * 100));
  const t = pct / 100;
  const [r, g, b] = ACCENT_RGB.map((c, i) => Math.round(c * t + TRACK_RGB[i] * (1 - t)));
  return `rgb(${r}, ${g}, ${b})`;
};

const formatHour = (hour) => {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
};
</script>
