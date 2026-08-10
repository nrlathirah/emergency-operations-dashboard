<template>
  <div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <span class="text-red-500 text-sm">⚠️ {{ message }}</span>
    <button
      type="button"
      @click="emit('retry')"
      class="text-teal-600 hover:underline text-xs font-medium cursor-pointer"
    >Try again</button>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: "Failed to load data." },
});
const emit = defineEmits(["retry"]);
</script>
