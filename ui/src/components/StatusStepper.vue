<template>
  <div class="flex items-center" :title="statusLabel">
    <template v-for="(step, index) in steps" :key="step">
      <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="stepClass(index)"></div>
      <div
        v-if="index < steps.length - 1"
        class="h-0.5 w-3 flex-shrink-0"
        :class="index < currentIndex ? 'bg-blue-500' : 'bg-gray-200'"
      ></div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
});

const steps = ["open", "dispatched", "en_route", "on_scene", "closed"];
const stepLabels = {
  open: "Open",
  dispatched: "Dispatched",
  en_route: "En Route",
  on_scene: "On Scene",
  closed: "Closed",
};

const currentIndex = computed(() => steps.indexOf(props.status));
const statusLabel = computed(() => stepLabels[props.status] || props.status);

const stepClass = (index) => {
  if (index < currentIndex.value) return "bg-blue-500";
  if (index === currentIndex.value) return "bg-blue-600 ring-2 ring-blue-200";
  return "bg-gray-200";
};
</script>
