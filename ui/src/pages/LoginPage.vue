<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 px-4">
    <form v-if="!showForgotPassword" @submit.prevent="handleLogin" class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm space-y-5">
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
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm text-gray-600">Password</label>
          <button
            type="button"
            @click="openForgotPassword"
            class="text-xs text-teal-600 hover:underline cursor-pointer"
          >Forgot password?</button>
        </div>
        <PasswordInput v-model="password" size="lg" required />
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

    <!-- Forgot password — always shows the same generic confirmation
         regardless of whether the email matched anything, so this can't be
         used to probe for which emails are registered. -->
    <div v-else class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm">
      <template v-if="!resetRequestSent">
        <div class="text-center mb-5">
          <div class="text-3xl mb-2">🔑</div>
          <h1 class="text-lg font-semibold text-slate-900">Forgot Password</h1>
          <p class="text-xs text-gray-500 mt-1">Enter your email and an admin will be notified to reset it for you.</p>
        </div>
        <form @submit.prevent="handleForgotPassword" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">Email</label>
            <input
              v-model="resetEmail"
              type="email"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            :disabled="resetSubmitting"
            class="w-full bg-teal-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-700 transition cursor-pointer disabled:opacity-70 disabled:cursor-default"
          >{{ resetSubmitting ? "Submitting…" : "Submit Request" }}</button>
          <button
            type="button"
            @click="showForgotPassword = false"
            class="w-full text-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >Back to login</button>
        </form>
      </template>
      <template v-else>
        <div class="text-center">
          <!-- Demo account emails are already public (they're on the Quick
               Login buttons right below), so saying so here leaks nothing —
               it just saves a tester from waiting on a request that will
               never be picked up. -->
          <template v-if="resetWasDemoAccount">
            <div class="text-3xl mb-2">ℹ️</div>
            <h1 class="text-lg font-semibold text-slate-900">This Is a Shared Demo Account</h1>
            <p class="text-sm text-gray-500 mt-2">Forgot Password isn't available for it, since its credentials are already public on this page. Use the Quick Login button below, or log in directly with <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">password123</code>.</p>
          </template>
          <template v-else>
            <div class="text-3xl mb-2">✅</div>
            <h1 class="text-lg font-semibold text-slate-900">Request Submitted</h1>
            <p class="text-sm text-gray-500 mt-2">If that email is registered, your request has been noted (or you already have one pending) — an admin will review it soon. No need to submit again.</p>
          </template>
          <button
            type="button"
            @click="showForgotPassword = false"
            class="mt-5 w-full bg-teal-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-700 transition cursor-pointer"
          >Back to login</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { authService } from "../services/authService";
import PasswordInput from "../components/PasswordInput.vue";

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
    router.push(authStore.user?.mustChangePassword ? "/change-password-required" : "/");
  } catch (err) {
    error.value = "Invalid email or password. Please try again.";
  } finally {
    loading.value = false;
  }
};

const showForgotPassword = ref(false);
const resetEmail = ref("");
const resetSubmitting = ref(false);
const resetRequestSent = ref(false);
const resetWasDemoAccount = ref(false);

const openForgotPassword = () => {
  resetEmail.value = email.value; // carry over whatever they'd already typed
  resetRequestSent.value = false;
  resetWasDemoAccount.value = false;
  showForgotPassword.value = true;
};

const handleForgotPassword = async () => {
  if (resetSubmitting.value) return; // guard against a duplicate submit sneaking in
  resetSubmitting.value = true;

  const isDemoAccount = quickLoginRoles.some(
    (r) => r.email.toLowerCase() === resetEmail.value.trim().toLowerCase()
  );
  resetWasDemoAccount.value = isDemoAccount;

  if (!isDemoAccount) {
    try {
      await authService.requestPasswordReset(resetEmail.value);
    } catch (err) {
      // Still show the generic confirmation — never leak whether it failed
      // because the email didn't exist vs. an actual server error.
    }
  }

  resetSubmitting.value = false;
  resetRequestSent.value = true;
};
</script>
