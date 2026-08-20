<template>
  <div class="rb-stacked">
    <div class="rb-stacked-legend">
      <span v-for="seg in legend" :key="seg.key"><span class="rb-dot" :style="{ background: seg.color }"></span>{{ seg.label }}</span>
    </div>
    <div class="rb-stacked-rows" @mouseleave="hovered = null">
      <div v-for="row in rows" :key="row.label" class="rb-stacked-row">
        <span class="rb-stacked-row-label" :style="{ color: row.color }">{{ row.label }}</span>
        <div class="rb-stacked-bar">
          <!-- The tooltip follows the cursor (see hovered/trackMouse below)
               rather than sitting fixed above the segment, so this wrapper
               just sizes to the width percentage and triggers it. -->
          <span
            v-for="seg in row.segments"
            :key="seg.key"
            class="rb-stacked-seg-wrap"
            :style="{ width: pct(seg.value, row.total) + '%' }"
            @mouseenter="hovered = { row, seg }"
            @mousemove="trackMouse"
            @mouseleave="hovered = null"
          >
            <span class="rb-stacked-seg" :style="{ background: seg.color }"></span>
          </span>
        </div>
        <span class="rb-stacked-row-total tabular">{{ row.total }}</span>
      </div>
      <div v-if="hovered" class="rb-chart-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
        {{ hovered.row.label }} · {{ hovered.seg.label }}: {{ hovered.seg.value }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  legend: { type: Array, required: true }, // [{ key, label, color }]
  rows: { type: Array, required: true }, // [{ label, color?, total, segments: [{ key, label, value, color }] }]
});

const pct = (value, total) => (total > 0 ? (value / total) * 100 : 0);

// Follows the cursor rather than sitting fixed above the segment,
// positioned relative to .rb-stacked-rows (shared by every row).
const hovered = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const trackMouse = (event) => {
  const rect = event.currentTarget.closest(".rb-stacked-rows").getBoundingClientRect();
  tooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
};
</script>
