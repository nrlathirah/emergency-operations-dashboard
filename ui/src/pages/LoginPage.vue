<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 px-4">
    <form @submit.prevent="handleLogin" class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm space-y-5">
      <div class="text-center">
        <div class="text-4xl mb-2">🚨</div>
        <h1 class="text-lg font-semibold text-slate-900">Emergency Operations Dashboard</h1>
        <p class="text-xs text-gray-500 mt-1">Multi-Agency Coordination Platform</p>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Email</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Password</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
        />
      </div>

      <p v-if="error" class="text-red-600 text-sm text-center">{{ error }}</p>

      <button
        type="submit"
        class="w-full bg-teal-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-700 transition cursor-pointer"
      >
        Log In
      </button>

      <p class="text-center text-[11px] text-gray-400 pt-2 border-t border-gray-100">
        Authorized personnel only · KKM · PDRM · JBPM
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();
const authStore = useAuthStore();

const handleLogin = async () => {
  error.value = "";
  try {
    await authStore.login(email.value, password.value);
    router.push("/");
  } catch (err) {
    error.value = "Invalid email or password. Please try again.";
  }
};
</script>
