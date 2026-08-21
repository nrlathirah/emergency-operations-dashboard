<template>
  <div>
    <div class="rb-bubbles">
      <div
        v-for="row in rows"
        :key="row.label"
        class="rb-bubble-col"
        :class="{ 'rb-bubble-col--clickable': clickable }"
        @click="clickable && $emit('row-click', row)"
      >
        <!-- Tooltip lives on this wrapper, sized to match the bubble, not
             on the bubble itself — a pseudo-element tooltip inherits its
             own host's transform, so the hover-grow on .rb-bubble would
             otherwise stretch the tooltip text too. -->
        <div
          class="rb-bubble-wrap rb-tooltip-target"
          :style="{ width: size(row.value) + 'px', height: size(row.value) + 'px' }"
          :data-tooltip="`${row.label}: ${row.value}`"
        >
          <div class="rb-bubble" :style="{ background: row.color, '--glow': row.color }">
            <span class="rb-bubble-value">{{ row.value }}</span>
          </div>
        </div>
        <span class="rb-bubble-label">{{ row.label }}</span>
      </div>
    </div>
    <p v-if="caption" class="rb-bar-caption">{{ caption }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  rows: { type: Array, required: true }, // [{ label, value, color }]
  caption: { type: String, default: "" },
  clickable: { type: Boolean, default: false },
});
defineEmits(["row-click"]);

const MIN_SIZE = 30;
const MAX_SIZE = 76;

const maxValue = computed(() => Math.max(1, ...props.rows.map((r) => r.value)));

// Diameter scaled by sqrt(value) rather than value directly, so circle
// *area* (not just diameter) stays roughly proportional to the count —
// the standard convention for bubble charts.
const size = (value) => MIN_SIZE + (MAX_SIZE - MIN_SIZE) * Math.sqrt(value / maxValue.value);
</script>
