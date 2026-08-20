<template>
  <div class="rb-waffle">
    <div class="rb-waffle-grid">
      <!-- Tooltip lives on this wrapper (the actual grid item), not on the
           colored cell inside it — a pseudo-element tooltip inherits its
           own host's transform, so the hover-grow on .rb-waffle-cell would
           otherwise stretch the tooltip text too. -->
      <span
        v-for="(cell, i) in waffleCells"
        :key="i"
        class="rb-waffle-cell-wrap rb-tooltip-target"
        :data-tooltip="`${cell.label}: ${cell.value}`"
      >
        <span class="rb-waffle-cell" :style="{ background: cell.color }"></span>
      </span>
    </div>
    <div class="rb-waffle-legend">
      <span
        v-for="seg in segments"
        :key="seg.label"
        :class="{ 'rb-waffle-legend-item--clickable': clickable }"
        @click="clickable && $emit('row-click', seg)"
      >
        <span class="rb-dot" :style="{ background: seg.color }"></span>{{ seg.label }} <b class="tabular">{{ seg.value }}</b>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  segments: { type: Array, required: true }, // [{ label, value, color }]
  clickable: { type: Boolean, default: false },
});
defineEmits(["row-click"]);

// 100 cells, each ~1% — the last segment absorbs the rounding remainder so
// the grid always fills exactly 100 cells regardless of how the individual
// percentages round. Each cell carries its segment's label/value along
// with its color, so hovering any cell — not just the legend — shows what
// it represents.
const waffleCells = computed(() => {
  const total = props.segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let assigned = 0;
  const cells = [];
  props.segments.forEach((seg, i) => {
    const count = i === props.segments.length - 1 ? 100 - assigned : Math.round((seg.value / total) * 100);
    assigned += count;
    for (let j = 0; j < count; j++) cells.push({ color: seg.color, label: seg.label, value: seg.value });
  });
  return cells;
});
</script>
