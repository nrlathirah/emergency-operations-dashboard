<template>
  <div class="flex items-center justify-center py-10 px-4">
    <form @submit.prevent="handleSubmit" class="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-5">
      <div class="text-center">
        <div class="text-4xl mb-2">🔒</div>
        <h1 class="text-lg font-semibold text-gray-900">Set a New Password</h1>
        <p class="text-xs text-gray-500 mt-1">Your password was set by an admin — you must choose your own before continuing.</p>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Current (Temporary) Password</label>
        <PasswordInput v-model="currentPassword" size="lg" required />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">New Password</label>
        <PasswordInput v-model="newPassword" size="lg" required minlength="6" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Confirm New Password</label>
        <PasswordInput v-model="confirmPassword" size="lg" required minlength="6" />
      </div>

      <p v-if="error" class="text-red-600 text-sm text-center">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full bg-teal-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-700 transition cursor-pointer disabled:opacity-70 disabled:cursor-default"
      >{{ submitting ? "Saving…" : "Set New Password" }}</button>

      <button
        v-if="!confirmingLogout"
        type="button"
        @click="confirmingLogout = true"
        class="w-full text-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
      >Not you? Log out</button>
      <div v-else class="text-center text-xs">
        <span class="text-gray-500">Log out of this account? </span>
        <button type="button" @click="handleLogout" class="text-red-600 font-medium hover:underline cursor-pointer">Yes</button>
        <span class="text-gray-300"> · </span>
        <button type="button" @click="confirmingLogout = false" class="text-gray-500 hover:underline cursor-pointer">Cancel</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { userService } from "../services/userService";
import PasswordInput from "../components/PasswordInput.vue";

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref("");
const submitting = ref(false);
const confirmingLogout = ref(false);
const router = useRouter();
const authStore = useAuthStore();

const handleSubmit = async () => {
  error.value = "";

  if (newPassword.value !== confirmPassword.value) {
    error.value = "New password and confirmation don't match.";
    return;
  }

  submitting.value = true;
  try {
    await userService.changeMyPassword(currentPassword.value, newPassword.value);
    authStore.clearMustChangePassword();
    router.push("/");
  } catch (err) {
    error.value = err.response?.data?.message || "Failed to set new password. Please try again.";
  } finally {
    submitting.value = false;
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};
</script>
