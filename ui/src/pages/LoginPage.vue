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
        :disabled="loading"
        class="w-full bg-teal-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-700 transition cursor-pointer disabled:opacity-70 disabled:cursor-default flex items-center justify-center gap-2"
      >
        <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        {{ loading ? "Logging in…" : "Log In" }}
      </button>
      <p v-if="loading" class="text-center text-[11px] text-gray-400 -mt-3">First login can take up to a minute if the server was idle.</p>

      <div class="pt-1">
        <p class="text-center text-[11px] text-gray-400 mb-2">Quick login for demo purposes</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="role in quickLoginRoles"
            :key="role.label"
            type="button"
            :disabled="loading"
            @click="quickFill(role)"
            class="px-2 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer transition hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
            :style="{ backgroundColor: role.color }"
          >{{ role.label }}</button>
        </div>
      </div>

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
const loading = ref(false);
const router = useRouter();
const authStore = useAuthStore();

// Seeded demo accounts (see api/src/seed.js) — colors match each agency's
// header/badge color elsewhere in the app.
const quickLoginRoles = [
  { label: "Super Admin", email: "admin@ops.gov.my", color: "#581c87" },
  { label: "KKM Staff", email: "ahmad.razak@kkm.gov.my", color: "#7f1d1d" },
  { label: "PDRM Staff", email: "zul.hassan@pdrm.gov.my", color: "#1e3a8a" },
  { label: "JBPM Staff", email: "faizal.anuar@jbpm.gov.my", color: "#92400e" },
];

const quickFill = (role) => {
  email.value = role.email;
  password.value = "password123";
  error.value = "";
};

const handleLogin = async () => {
  if (loading.value) return; // guard against a duplicate submit sneaking in
  error.value = "";
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    router.push("/");
  } catch (err) {
    error.value = "Invalid email or password. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>
