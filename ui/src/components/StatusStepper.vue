<template>
  <div class="flex items-center w-full px-2 sm:px-4 py-2">
    <template v-for="(step, index) in steps" :key="step.key">
      <div class="flex flex-col items-center gap-1">
        <div
          class="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-semibold flex-shrink-0"
          :style="dotStyle(index)"
        >
          <span v-if="index < currentIndex">✓</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <!-- No whitespace-nowrap and a capped width — a single-word label
             ("Open", "Dispatched") has nowhere to break so it still renders
             on one line regardless, but a two-word one ("En Route", "On
             Scene") can fold onto a second line at a narrow width instead
             of forcing its column (and so the whole stepper) wider just to
             stay on one line. -->
        <span
          class="text-[9px] sm:text-[11px] text-center leading-tight max-w-[46px] sm:max-w-none"
          :class="index <= currentIndex ? 'text-gray-700 font-medium' : 'text-gray-400'"
        >{{ step.label }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="h-0.5 flex-1 mx-1 sm:mx-2 -mt-4"
        :class="{ 'progress-line--active': index === currentIndex }"
        :style="index === currentIndex ? {} : lineStyle(index)"
      ></div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
});

// One fixed color for every agency — a neutral teal, distinct from every
// agency color (KKM red, PDRM navy, JBPM amber) and the super-admin indigo.
// Referenced as CSS custom properties (not literal hex) so the stepper
// follows the light/dark theme automatically, same as everything else that
// reads these tokens.
const colors = { main: "var(--accent)", light: "var(--accent-soft)" };

const steps = [
  { key: "open", label: "Open" },
  { key: "dispatched", label: "Dispatched" },
  { key: "en_route", label: "En Route" },
  { key: "on_scene", label: "On Scene" },
  { key: "closed", label: "Closed" },
];

const currentIndex = computed(() => steps.findIndex((s) => s.key === props.status));

const dotStyle = (index) => {
  if (index < currentIndex.value) return { backgroundColor: colors.main, color: "var(--accent-contrast)" };
  if (index === currentIndex.value) {
    return { backgroundColor: colors.main, color: "var(--accent-contrast)", boxShadow: `0 0 0 4px ${colors.light}` };
  }
  return { backgroundColor: "var(--surface-2)", color: "var(--muted)" };
};

const lineStyle = (index) => ({
  backgroundColor: index < currentIndex.value ? colors.main : "var(--surface-2)",
});
</script>

<style scoped>
/* The segment leading from the current status toward the next one — a soft
   base tint with a bright highlight sweeping across it on a loop, reading as
   "in progress, heading there" instead of a static completed/pending line.
   Only ever shows on the one segment right after the current step; there's
   naturally no such segment once closed. */
.progress-line--active {
  position: relative;
  background-color: var(--accent-soft);
  overflow: hidden;
}

.progress-line--active::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 50%;
  background: linear-gradient(to right, transparent, var(--accent), transparent);
  animation: progress-sweep 1.4s ease-in-out infinite;
}

@keyframes progress-sweep {
  from { transform: translateX(-100%); }
  to { transform: translateX(200%); }
}
</style>
