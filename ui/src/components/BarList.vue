<template>
  <div class="rb-bar-list" @mouseleave="hovered = null">
    <div class="rb-bar-row" v-for="row in rows" :key="row.label">
      <span class="rb-bar-row-label">
        <slot name="label" :row="row">{{ row.label }}</slot>
      </span>
      <span class="rb-bar-track" @mouseenter="hovered = row" @mousemove="trackMouse" @mouseleave="hovered = null">
        <span class="rb-bar-fill" :style="{ width: widthFor(row.value) + '%', background: row.color || 'var(--accent)' }"></span>
      </span>
      <!-- Hidden in the live view (the tooltip below shows this on hover
           now) but kept in the markup and shown only in the export copy —
           a downloaded/printed image has no hover, so it still needs the
           number written out. See .rb-bar-row-value in design-system.css. -->
      <span class="rb-bar-row-value tabular">{{ row.value }}</span>
    </div>
    <div v-if="hovered" class="rb-chart-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
      {{ hovered.label }}: {{ hovered.value }}
    </div>
  </div>
  <p v-if="caption" class="rb-bar-caption">{{ caption }}</p>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  rows: { type: Array, required: true }, // [{ label, value, color? }]
  caption: { type: String, default: "" },
});

// A linear scale would make small values next to a dominant one (e.g. a
// handful of active cases next to hundreds of closed ones) shrink to an
// invisible sliver — the 6% floor keeps every row visibly present while the
// exact number alongside it stays the source of truth.
const MIN_WIDTH_PERCENT = 6;

const maxValue = computed(() => Math.max(1, ...props.rows.map((r) => r.value)));
const widthFor = (value) => Math.max(MIN_WIDTH_PERCENT, Math.round((value / maxValue.value) * 100));

// Follows the cursor along the bar rather than sitting fixed above it — one
// shared tooltip for the whole list, positioned relative to .rb-bar-list.
const hovered = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const trackMouse = (event) => {
  const rect = event.currentTarget.closest(".rb-bar-list").getBoundingClientRect();
  tooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
};
</script>
