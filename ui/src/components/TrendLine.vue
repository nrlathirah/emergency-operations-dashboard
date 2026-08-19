<template>
  <div class="rb-trend-chart">
    <svg viewBox="0 0 900 220" preserveAspectRatio="none" aria-hidden="true">
      <line class="rb-grid-line" x1="0" y1="30" x2="900" y2="30"></line>
      <line class="rb-grid-line" x1="0" y1="110" x2="900" y2="110"></line>
      <line class="rb-grid-line" x1="0" y1="190" x2="900" y2="190"></line>
      <path class="rb-trend-area" :d="areaPath"></path>
      <polyline class="rb-trend-line" :points="linePoints"></polyline>
      <circle v-if="peak" class="rb-trend-point" :cx="peak.x" :cy="peak.y" r="4.5"></circle>
      <!-- No in-SVG label here on purpose: this SVG uses preserveAspectRatio="none"
           (needed so the line/area fill the whole panel width), which stretches
           any actual text glyphs non-uniformly and makes them look distorted.
           A straight line isn't affected the same way, so the line stays but
           its meaning is explained in the plain-HTML caption above instead. -->
      <line v-if="referenceY !== null" class="rb-trend-reference" x1="0" :y1="referenceY" x2="900" :y2="referenceY"></line>
    </svg>
    <div class="rb-trend-axis">
      <span v-for="(label, i) in axisLabels" :key="i">{{ label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  points: { type: Array, required: true }, // [{ date: "YYYY-MM-DD", value }]
  // Optional dashed target line (e.g. an SLA threshold) — omit for a plain trend.
  referenceValue: { type: Number, default: null },
});

const WIDTH = 900;
const BASELINE_Y = 190;
const TOP_MARGIN_Y = 30;

// The reference value counts toward the scale too, so a target line above
// the current data range doesn't get clipped off the top of the chart.
const maxValue = computed(() => Math.max(1, props.referenceValue || 0, ...props.points.map((p) => p.value)));

const coords = computed(() => {
  const n = props.points.length;
  return props.points.map((p, i) => {
    const x = n <= 1 ? WIDTH / 2 : (i / (n - 1)) * WIDTH;
    const y = BASELINE_Y - (p.value / maxValue.value) * (BASELINE_Y - TOP_MARGIN_Y);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });
});

const referenceY = computed(() => {
  if (props.referenceValue === null) return null;
  return Math.round((BASELINE_Y - (props.referenceValue / maxValue.value) * (BASELINE_Y - TOP_MARGIN_Y)) * 10) / 10;
});

const linePoints = computed(() => coords.value.map((c) => `${c.x},${c.y}`).join(" "));

const areaPath = computed(() => {
  if (coords.value.length === 0) return "";
  const first = coords.value[0];
  const last = coords.value[coords.value.length - 1];
  const middle = coords.value.map((c) => `L${c.x},${c.y}`).join(" ");
  return `M${first.x},${BASELINE_Y} ${middle} L${last.x},${BASELINE_Y} Z`;
});

const peak = computed(() => {
  if (props.points.length === 0) return null;
  let peakIndex = 0;
  props.points.forEach((p, i) => {
    if (p.value > props.points[peakIndex].value) peakIndex = i;
  });
  return coords.value[peakIndex];
});

const formatAxisDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
};

// 5 evenly-spaced labels regardless of how many days of data there are.
const axisLabels = computed(() => {
  const n = props.points.length;
  if (n === 0) return [];
  const indices = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.min(n - 1, Math.round(f * (n - 1))));
  return [...new Set(indices)].map((i) => formatAxisDate(props.points[i].date));
});
</script>
