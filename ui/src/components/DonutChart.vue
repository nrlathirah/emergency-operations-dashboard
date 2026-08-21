<template>
  <div class="rb-donut-wrap">
    <div class="rb-donut" @mouseleave="hovered = null">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface-2)" stroke-width="22" />
        <g transform="rotate(-90 50 50)">
          <circle
            v-for="arc in arcs"
            :key="arc.label"
            class="rb-donut-arc"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            :stroke="arc.color"
            :style="{ '--glow': arc.color }"
            stroke-width="22"
            :stroke-dasharray="`${arc.dash} ${CIRCUMFERENCE - arc.dash}`"
            :stroke-dashoffset="-arc.offset"
            @mouseenter="hovered = arc"
            @mousemove="trackMouse"
            @mouseleave="hovered = null"
          />
        </g>
      </svg>
      <div class="rb-donut-center">
        <strong class="tabular">{{ total }}</strong>
        <span>{{ centerLabel }}</span>
      </div>
      <div v-if="hovered" class="rb-chart-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
        {{ hovered.label }}: {{ hovered.value }}
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
import { ref, computed } from "vue";

// SVG stroke-based ring rather than a conic-gradient background — html2canvas
// (used for the chart image download/print) doesn't support conic-gradient
// and renders it as blank, but it handles plain SVG shapes fine.
const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const props = defineProps({
  segments: { type: Array, required: true }, // [{ label, value, color }]
  centerLabel: { type: String, default: "Total" },
});

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0));

const arcs = computed(() => {
  if (total.value === 0) return [];
  let cumulative = 0;
  return props.segments.map((seg) => {
    const dash = (seg.value / total.value) * CIRCUMFERENCE;
    const arc = { label: seg.label, value: seg.value, color: seg.color, dash, offset: cumulative };
    cumulative += dash;
    return arc;
  });
});

// SVG shapes can't reliably position CSS-generated (::after) tooltips the
// way plain HTML elements can, so the ring tracks the mouse itself and
// positions one shared tooltip div in plain HTML alongside it.
const hovered = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const trackMouse = (event) => {
  const rect = event.currentTarget.closest(".rb-donut").getBoundingClientRect();
  tooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
};
</script>
