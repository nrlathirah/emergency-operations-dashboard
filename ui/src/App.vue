<template>
  <div class="min-h-screen bg-slate-50">
    <header v-if="authStore.isLoggedIn" class="bg-slate-900 text-white px-6 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Emergency Operations Dashboard</h1>
        <div class="flex items-center gap-3 text-sm">
          <span>{{ authStore.user.name }} ({{ authStore.user.role }}{{ authStore.user.agency ? ' · ' + authStore.user.agency : '' }})</span>
          <button @click="handleLogout" class="bg-slate-700 px-3 py-1 rounded hover:bg-slate-600">Logout</button>
        </div>
      </div>
      <nav class="mt-2 flex gap-4 text-sm">
        <RouterLink to="/" class="hover:text-blue-300" active-class="text-blue-400 font-medium">Live Dashboard</RouterLink>
        <RouterLink v-if="canManageUsers" to="/users" class="hover:text-blue-300" active-class="text-blue-400 font-medium">Users</RouterLink>
        <RouterLink to="/reports" class="hover:text-blue-300" active-class="text-blue-400 font-medium">Reports</RouterLink>
      </nav>
    </header>
    <main :class="authStore.isLoggedIn ? 'p-6 max-w-6xl mx-auto' : ''">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";

const authStore = useAuthStore();
const router = useRouter();

const canManageUsers = computed(() =>
  ["admin", "super_admin"].includes(authStore.user?.role)
);

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};
</script>
