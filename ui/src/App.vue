<template>
  <div class="min-h-screen bg-slate-50">
    <header v-if="authStore.isLoggedIn" :style="{ backgroundColor: headerColor }" class="text-white px-6 py-4 shadow-md">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🚨</span>
          <div>
            <h1 class="text-lg font-semibold leading-tight">Emergency Operations Dashboard</h1>
            <p class="text-xs text-white/70 leading-tight">Multi-Agency Coordination Platform</p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <div class="flex flex-col items-end leading-tight">
            <span class="font-medium">{{ authStore.user.name }}</span>
            <span
              class="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5"
              :style="{ backgroundColor: badgeColor }"
            >{{ roleLabel }}</span>
          </div>
          <button @click="handleLogout" class="bg-black/20 px-3 py-1.5 rounded hover:bg-black/30 transition">Logout</button>
        </div>
      </div>
      <nav class="mt-3 flex gap-1 text-sm">
        <RouterLink
          to="/"
          class="px-3 py-1.5 rounded-t transition"
          active-class="bg-white/15 font-medium"
        >Live Dashboard</RouterLink>
        <RouterLink
          v-if="canManageUsers"
          to="/users"
          class="px-3 py-1.5 rounded-t transition"
          active-class="bg-white/15 font-medium"
        >Users</RouterLink>
        <RouterLink
          to="/reports"
          class="px-3 py-1.5 rounded-t transition"
          active-class="bg-white/15 font-medium"
        >Reports</RouterLink>
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

const AGENCY_THEME = {
  super_admin: "#312e81", // indigo-900 — distinct "master" identity
  KKM: "#7f1d1d",         // dark red
  PDRM: "#1e3a8a",        // dark blue
  JBPM: "#7c2d12",        // dark orange
};

const headerColor = computed(() => {
  if (authStore.user?.role === "super_admin") return AGENCY_THEME.super_admin;
  return AGENCY_THEME[authStore.user?.agency] || "#0f172a";
});

const badgeColor = computed(() => {
  if (authStore.user?.role === "super_admin") return "#4338ca";
  const colors = { KKM: "#dc2626", PDRM: "#2563eb", JBPM: "#ea580c" };
  return colors[authStore.user?.agency] || "#475569";
});

const roleLabel = computed(() => {
  if (!authStore.user) return "";
  if (authStore.user.role === "super_admin") return "Super Admin · All Agencies";
  return `${authStore.user.role} · ${authStore.user.agency}`;
});

const canManageUsers = computed(() =>
  ["admin", "super_admin"].includes(authStore.user?.role)
);

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};
</script>
