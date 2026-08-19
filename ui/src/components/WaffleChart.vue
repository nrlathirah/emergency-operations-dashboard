<template>
  <div class="rb-waffle">
    <div class="rb-waffle-grid">
      <span v-for="(color, i) in cellColors" :key="i" class="rb-waffle-cell" :style="{ background: color }"></span>
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
// percentages round.
const cellColors = computed(() => {
  const total = props.segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let assigned = 0;
  const cells = [];
  props.segments.forEach((seg, i) => {
    const count = i === props.segments.length - 1 ? 100 - assigned : Math.round((seg.value / total) * 100);
    assigned += count;
    for (let j = 0; j < count; j++) cells.push(seg.color);
  });
  return cells;
});
</script>
