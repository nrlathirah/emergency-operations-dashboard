<template>
  <div class="bg-white border rounded-lg shadow-sm p-4 flex flex-col h-full">
    <h3 class="text-sm font-medium text-gray-600 mb-3">{{ title }}</h3>
    <div class="flex-1 min-h-0">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
});
</script>
