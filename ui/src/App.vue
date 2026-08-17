<template>
  <div class="min-h-screen bg-slate-50">
    <header v-if="authStore.isLoggedIn" :style="{ backgroundColor: headerColor }" class="text-white px-4 sm:px-6 py-3 sm:py-4 shadow-md">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ headerIcon }}</span>
          <div>
            <h1 class="text-base sm:text-lg font-semibold leading-tight">Emergency Operations Dashboard</h1>
            <p class="text-xs text-white/70 leading-tight">{{ headerSubtitle }}</p>
          </div>
        </div>
        <div class="relative text-sm ml-auto" data-user-menu @click.stop>
          <button
            type="button"
            @click="toggleUserMenu"
            class="flex items-center gap-2 px-2 py-1 rounded hover:bg-black/10 transition cursor-pointer"
          >
            <div class="hidden sm:flex flex-col items-end leading-tight">
              <span class="font-medium">{{ authStore.user.name }}</span>
              <span
                class="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5"
                :style="{ backgroundColor: badgeColor }"
              >{{ roleLabel }}</span>
            </div>
            <span class="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
              {{ authStore.user.name.charAt(0).toUpperCase() }}
            </span>
            <span class="text-[10px] text-white/70">▾</span>
          </button>

          <div
            v-if="showUserMenu"
            class="absolute right-0 top-full mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg py-1 text-sm"
            style="z-index: 9999;"
          >
            <!-- Only shown on mobile, where the trigger button hides the
                 name/role to save header space — desktop already shows it. -->
            <div class="sm:hidden px-3 py-2 border-b border-gray-100">
              <p class="font-medium text-gray-800">{{ authStore.user.name }}</p>
              <span
                class="inline-block text-[11px] uppercase tracking-wide font-semibold mt-1"
                :style="{ color: badgeColor }"
              >{{ roleLabel }}</span>
            </div>
            <template v-if="!confirmingLogout">
              <button
                type="button"
                @click="openEditName"
                class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >✏️ Edit Name</button>
              <button
                type="button"
                @click="showChangePassword = true; showUserMenu = false"
                class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >🔒 Change Password</button>
              <button
                type="button"
                @click="confirmingLogout = true"
                class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer text-red-600"
              >🚪 Logout</button>
            </template>
            <template v-else>
              <div class="px-3 py-2">
                <p class="text-[11px] text-gray-600 mb-2">Log out of your account?</p>
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="handleLogout"
                    class="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700 cursor-pointer transition"
                  >Yes, Logout</button>
                  <button
                    type="button"
                    @click="confirmingLogout = false"
                    class="px-2.5 py-1 border border-gray-300 text-gray-500 rounded text-[11px] hover:bg-gray-50 cursor-pointer transition"
                  >Cancel</button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
      <nav class="mt-3 flex flex-wrap text-sm">
        <RouterLink
          to="/"
          class="px-3 py-1.5 rounded-t transition hover:bg-white/10"
          active-class="bg-white/15 font-medium"
        >Live Dashboard</RouterLink>
        <RouterLink
          v-if="canManageUsers"
          to="/users"
          class="px-3 py-1.5 rounded-t transition hover:bg-white/10"
          active-class="bg-white/15 font-medium"
        >Users</RouterLink>
        <RouterLink
          to="/reports"
          class="px-3 py-1.5 rounded-t transition hover:bg-white/10"
          active-class="bg-white/15 font-medium"
        >Reports</RouterLink>
      </nav>
    </header>
    <main :class="authStore.isLoggedIn ? 'p-4 sm:p-6 max-w-screen-2xl mx-auto' : ''">
      <RouterView />
    </main>
    <footer v-if="authStore.isLoggedIn" class="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
      Emergency Operations Dashboard · Multi-Agency Coordination Platform
    </footer>

    <!-- Edit Name modal -->
    <div v-if="showEditName" class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-gray-800">
        <h3 class="text-base font-semibold mb-4">Edit Name</h3>
        <form @submit.prevent="handleEditName" class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Name</label>
            <input
              v-model="editNameValue"
              type="text"
              required
              class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>

          <p v-if="editNameError" class="text-red-600 text-xs">{{ editNameError }}</p>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              @click="closeEditName"
              class="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 cursor-pointer"
            >Cancel</button>
            <button
              type="submit"
              :disabled="savingName"
              class="flex-1 px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >{{ savingName ? "Saving…" : "Save" }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Change Password modal. z-index far above Leaflet's own panes/controls
         (which reach ~1000) — otherwise the map renders on top of this. -->
    <div v-if="showChangePassword" class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-gray-800">
        <h3 class="text-base font-semibold mb-4">Change Password</h3>
        <form @submit.prevent="handleChangePassword" class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Current Password</label>
            <PasswordInput v-model="passwordForm.current" required />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">New Password</label>
            <PasswordInput v-model="passwordForm.new" required minlength="6" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Confirm New Password</label>
            <PasswordInput v-model="passwordForm.confirm" required minlength="6" />
          </div>

          <p v-if="passwordError" class="text-red-600 text-xs">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="text-teal-600 text-xs">{{ passwordSuccess }}</p>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              @click="closeChangePassword"
              class="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 cursor-pointer"
            >Cancel</button>
            <button
              type="submit"
              :disabled="changingPassword"
              class="flex-1 px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >{{ changingPassword ? "Saving…" : "Save" }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { userService } from "./services/userService";
import PasswordInput from "./components/PasswordInput.vue";

const authStore = useAuthStore();
const router = useRouter();

const AGENCY_THEME = {
  super_admin: "#581c87", // deep purple — oversees every agency, distinct from all 3
  KKM: "#7f1d1d",         // dark red
  PDRM: "#1e3a8a",        // dark blue
  JBPM: "#92400e",        // dark amber/gold
};

const AGENCY_FULL_NAMES = {
  KKM: "Kementerian Kesihatan Malaysia",
  PDRM: "Polis Diraja Malaysia",
  JBPM: "Jabatan Bomba dan Penyelamat Malaysia",
};

const AGENCY_ICONS = {
  KKM: "🏥",
  PDRM: "👮",
  JBPM: "🧑‍🚒",
};

const headerIcon = computed(() => {
  if (authStore.user?.role === "super_admin") return "🚨";
  return AGENCY_ICONS[authStore.user?.agency] || "🚨";
});

const headerSubtitle = computed(() => {
  if (authStore.user?.role === "super_admin") return "Multi-Agency Coordination Platform";
  return AGENCY_FULL_NAMES[authStore.user?.agency] || "Multi-Agency Coordination Platform";
});

const headerColor = computed(() => {
  if (authStore.user?.role === "super_admin") return AGENCY_THEME.super_admin;
  return AGENCY_THEME[authStore.user?.agency] || "#0f172a";
});

const badgeColor = computed(() => {
  if (authStore.user?.role === "super_admin") return "#7e22ce";
  const colors = { KKM: "#dc2626", PDRM: "#2563eb", JBPM: "#f59e0b" };
  return colors[authStore.user?.agency] || "#475569";
});

const roleLabel = computed(() => {
  if (!authStore.user) return "";
  if (authStore.user.role === "super_admin") return "Super Admin · All Agencies";
  return `${authStore.user.role} · ${authStore.user.agency}`;
});

const canManageUsers = computed(() => authStore.user?.role === "super_admin");

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};

const showUserMenu = ref(false);
const confirmingLogout = ref(false);

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
  confirmingLogout.value = false;
};

const handleOutsideUserMenuClick = (e) => {
  if (!e.target.closest("[data-user-menu]")) {
    showUserMenu.value = false;
    confirmingLogout.value = false;
  }
};
onMounted(() => window.addEventListener("click", handleOutsideUserMenuClick));
onUnmounted(() => window.removeEventListener("click", handleOutsideUserMenuClick));

const showEditName = ref(false);
const editNameValue = ref("");
const editNameError = ref("");
const savingName = ref(false);

const openEditName = () => {
  editNameValue.value = authStore.user.name;
  editNameError.value = "";
  showEditName.value = true;
  showUserMenu.value = false;
};

const closeEditName = () => {
  showEditName.value = false;
};

const handleEditName = async () => {
  editNameError.value = "";
  savingName.value = true;
  try {
    await userService.changeMyName(editNameValue.value);
    authStore.updateName(editNameValue.value.trim());
    closeEditName();
  } catch (err) {
    editNameError.value = err.response?.data?.message || "Failed to update name.";
  } finally {
    savingName.value = false;
  }
};

const showChangePassword = ref(false);
const changingPassword = ref(false);
const passwordError = ref("");
const passwordSuccess = ref("");
const passwordForm = ref({ current: "", new: "", confirm: "" });

const closeChangePassword = () => {
  showChangePassword.value = false;
};

const handleChangePassword = async () => {
  passwordError.value = "";
  passwordSuccess.value = "";

  if (passwordForm.value.new !== passwordForm.value.confirm) {
    passwordError.value = "New password and confirmation don't match.";
    return;
  }

  changingPassword.value = true;
  try {
    await userService.changeMyPassword(passwordForm.value.current, passwordForm.value.new);
    passwordSuccess.value = "Password changed successfully.";
    passwordForm.value = { current: "", new: "", confirm: "" };
  } catch (err) {
    passwordError.value = err.response?.data?.message || "Failed to change password.";
  } finally {
    changingPassword.value = false;
  }
};
</script>
