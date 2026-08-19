<template>
  <div class="rb-xybar">
    <div class="rb-xybar-plot">
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
          <span class="rb-xybar-value">{{ row.value }}</span>
          <div class="rb-xybar-bar" :style="{ height: pct(row.value) + '%', background: row.color || 'var(--accent)' }"></div>
        </div>
      </div>
    </div>
    <div class="rb-xybar-xaxis">
      <span v-for="row in rows" :key="row.label" class="rb-xybar-xtick">{{ row.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

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
</script>
