<template>
  <div class="rb-bar-list">
    <div class="rb-bar-row" v-for="row in rows" :key="row.label">
      <span class="rb-bar-row-label">
        <slot name="label" :row="row">{{ row.label }}</slot>
      </span>
      <span class="rb-bar-track">
        <span class="rb-bar-fill" :style="{ width: widthFor(row.value) + '%', background: row.color || 'var(--accent)' }"></span>
      </span>
      <span class="rb-bar-row-value tabular">{{ row.value }}</span>
    </div>
  </div>
  <p v-if="caption" class="rb-bar-caption">{{ caption }}</p>
</template>

<script setup>
import { computed } from "vue";

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
</script>
