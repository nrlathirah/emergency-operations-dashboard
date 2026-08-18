<template>
  <div class="rb-stacked">
    <div class="rb-stacked-legend">
      <span v-for="seg in legend" :key="seg.key"><span class="rb-dot" :style="{ background: seg.color }"></span>{{ seg.label }}</span>
    </div>
    <div class="rb-stacked-rows">
      <div v-for="row in rows" :key="row.label" class="rb-stacked-row">
        <span class="rb-stacked-row-label" :style="{ color: row.color }">{{ row.label }}</span>
        <div class="rb-stacked-bar">
          <span
            v-for="seg in row.segments"
            :key="seg.key"
            class="rb-stacked-seg"
            :style="{ width: pct(seg.value, row.total) + '%', background: seg.color }"
            :title="`${seg.label}: ${seg.value}`"
          ></span>
        </div>
        <span class="rb-stacked-row-total tabular">{{ row.total }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  legend: { type: Array, required: true }, // [{ key, label, color }]
  rows: { type: Array, required: true }, // [{ label, color?, total, segments: [{ key, label, value, color }] }]
});

const pct = (value, total) => (total > 0 ? (value / total) * 100 : 0);
</script>
