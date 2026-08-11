<template>
  <div class="relative">
    <input
      :type="visible ? 'text' : 'password'"
      v-model="model"
      v-bind="$attrs"
      :class="[
        'w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent',
        size === 'lg' ? 'rounded-lg px-3 py-2 text-sm pr-10' : 'rounded px-3 py-1.5 text-sm pr-9',
      ]"
    />
    <button
      type="button"
      tabindex="-1"
      @click="visible = !visible"
      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
      :aria-label="visible ? 'Hide password' : 'Show password'"
    >
      <svg v-if="!visible" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clip-rule="evenodd" />
        <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineOptions({ inheritAttrs: false });
defineProps({
  size: { type: String, default: "md" }, // "md" (compact modals) or "lg" (login-style pages)
});
const model = defineModel();
const visible = ref(false);
</script>
