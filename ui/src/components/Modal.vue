<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full" :class="width === 'md' ? 'max-w-md' : 'max-w-sm'">
      <slot />
    </div>
  </div>
</template>

<script setup>
// Purely the shared overlay/card shell every modal in the app was
// hand-rolling identically (Edit Name, Change Password, Add User, Reset
// Password) — visibility stays owned by the parent's own v-if, same as
// before, so this doesn't change when a modal opens/closes, only what
// markup renders it.
defineProps({
  width: { type: String, default: "sm" }, // sm | md
});
</script>
