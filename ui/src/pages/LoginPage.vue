<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100">
    <form @submit.prevent="handleLogin" class="bg-white rounded-lg shadow p-6 w-full max-w-sm space-y-4">
      <h1 class="text-lg font-semibold text-center">Emergency Operations Dashboard</h1>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Email</label>
        <input v-model="email" type="email" required class="w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Password</label>
        <input v-model="password" type="password" required class="w-full border rounded px-3 py-2 text-sm" />
      </div>

      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

      <button type="submit" class="w-full bg-blue-600 text-white rounded py-2 text-sm hover:bg-blue-700">
        Log In
      </button>
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
    error.value = "Invalid email or password";
  }
};
</script>
