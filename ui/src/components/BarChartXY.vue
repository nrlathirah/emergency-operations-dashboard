<template>
  <div class="rb-xybar">
    <div class="rb-xybar-plot" @mouseleave="hovered = null">
      <div v-for="tick in yTicks" :key="tick.value" class="rb-xybar-gridline" :style="{ bottom: tick.pct + '%' }">
        <span class="rb-xybar-ytick">{{ tick.value }}</span>
      </div>
      <div class="rb-xybar-bars">
        <div
          v-for="row in rows"
          :key="row.label"
          class="rb-xybar-col"
          :class="{ 'rb-xybar-col--clickable': clickable }"
          @click="clickable && $emit('row-click', row)"
        >
          <!-- Hidden in the live view (the hover tooltip below shows this
               instead) but kept in the markup and shown only in the export
               copy — a downloaded/printed image has no hover. See
               .rb-xybar-value in design-system.css. -->
          <span class="rb-xybar-value">{{ row.value }}</span>
          <!-- The tooltip follows the cursor (see hovered/trackMouse below)
               rather than sitting fixed above the bar, so this wrapper just
               sizes to match the bar's height and triggers it. -->
          <div
            class="rb-xybar-bar-wrap"
            :style="{ height: pct(row.value) + '%' }"
            @mouseenter="hovered = row"
            @mousemove="trackMouse"
            @mouseleave="hovered = null"
          >
            <div class="rb-xybar-bar" :style="{ background: row.color || 'var(--accent)' }"></div>
          </div>
        </div>
      </div>
      <div v-if="hovered" class="rb-chart-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
        {{ hovered.label }}: {{ hovered.value }}
      </div>
    </div>
    <div class="rb-xybar-xaxis">
      <span v-for="row in rows" :key="row.label" class="rb-xybar-xtick">{{ row.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  rows: { type: Array, required: true }, // [{ label, value, color? }]
  clickable: { type: Boolean, default: false },
});
defineEmits(["row-click"]);

// Rounds the axis top up to a "nice" number (nearest half-magnitude) so
// gridlines read like a real scale instead of stopping at an arbitrary max.
const niceMax = computed(() => {
  const raw = Math.max(1, ...props.rows.map((r) => r.value));
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  return Math.ceil(raw / (magnitude / 2)) * (magnitude / 2) || raw;
});

const pct = (value) => (value / niceMax.value) * 100;

const yTicks = computed(() => {
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const value = Math.round((niceMax.value / steps) * i);
    return { value, pct: (value / niceMax.value) * 100 };
  });
});

// Follows the cursor rather than sitting fixed above the bar, positioned
// relative to .rb-xybar-plot (which already anchors the gridlines).
const hovered = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const trackMouse = (event) => {
  const rect = event.currentTarget.closest(".rb-xybar-plot").getBoundingClientRect();
  tooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
};
</script>
