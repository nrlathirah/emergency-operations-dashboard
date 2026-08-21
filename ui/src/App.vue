<template>
  <div class="min-h-screen bg-gray-50">
    <header v-if="authStore.isLoggedIn" class="app-header">
      <div class="app-brand">
        <span class="app-brand-mark" aria-hidden="true">{{ headerIcon }}</span>
        <div class="app-brand-text">
          <span class="eyebrow">{{ headerSubtitle }}</span>
          <h1>Emergency Operations Dashboard</h1>
        </div>
      </div>
      <div class="relative text-sm ml-auto" data-user-menu @click.stop>
        <button
          type="button"
          @click="toggleUserMenu"
          class="app-account cursor-pointer px-2 py-1 rounded hover:bg-white/10 transition"
        >
          <div class="app-account-info">
            <span class="name">{{ authStore.user.name }}</span>
            <span
              class="role"
              :style="{ backgroundColor: badgeColor }"
            >{{ roleLabel }}</span>
          </div>
          <span class="app-avatar">
            {{ authStore.user.name.charAt(0).toUpperCase() }}
          </span>
          <span class="app-chevron">▾</span>
        </button>

        <div
          v-if="showUserMenu"
          class="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-100 text-gray-800 rounded-lg shadow-lg py-1 text-sm"
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
                @click="themeStore.toggle(); showUserMenu = false"
                class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
              >
                <svg v-if="themeStore.resolved === 'dark'" class="w-4 h-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                </svg>
                <svg v-else class="w-4 h-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
                </svg>
                {{ themeStore.resolved === "dark" ? "Light Mode" : "Dark Mode" }}
              </button>
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
    </header>
    <nav v-if="authStore.isLoggedIn" class="app-nav">
      <RouterLink to="/">Live Dashboard</RouterLink>
      <RouterLink v-if="canManageUsers" to="/users">Users</RouterLink>
      <RouterLink to="/reports">Reports</RouterLink>
    </nav>
    <main :class="authStore.isLoggedIn ? 'p-4 sm:p-6 max-w-screen-2xl mx-auto' : ''">
      <RouterView />
    </main>
    <footer v-if="authStore.isLoggedIn" class="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
      Emergency Operations Dashboard · Multi-Agency Coordination Platform
    </footer>


    <!-- Edit Name modal -->
    <Modal v-if="showEditName">
      <h3 class="text-base font-semibold mb-4 text-gray-900">Edit Name</h3>
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
    </Modal>

    <!-- Change Password modal -->
    <Modal v-if="showChangePassword">
      <h3 class="text-base font-semibold mb-4 text-gray-900">Change Password</h3>
      <form @submit.prevent="handleChangePassword" class="space-y-3">
        <div>
          <label class="block text-xs text-gray-600 mb-1">Current Password</label>
          <PasswordInput v-model="passwordForm.current" required />
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">New Password</label>
          <PasswordInput v-model="passwordForm.new" required minlength="8" />
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Confirm New Password</label>
          <PasswordInput v-model="passwordForm.confirm" required minlength="8" />
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
    </Modal>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useThemeStore } from "./stores/theme";
import { userService } from "./services/userService";
import PasswordInput from "./components/PasswordInput.vue";
import Modal from "./components/Modal.vue";

const authStore = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();

// Only matters while the store is in "system" mode — an explicit light/dark
// pick is static and needs no listener. Keeps a live OS theme change (e.g.
// the user's OS switches to dark at sunset) reflected without a reload.
const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const handleSystemThemeChange = () => {
  if (themeStore.mode === "system") themeStore.apply();
};
onMounted(() => darkMediaQuery.addEventListener("change", handleSystemThemeChange));
onUnmounted(() => darkMediaQuery.removeEventListener("change", handleSystemThemeChange));

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

// Matches the agency/priority color tokens defined in styles/design-system.css.
const badgeColor = computed(() => {
  if (authStore.user?.role === "super_admin") return "#5B3E92";
  const colors = { KKM: "#B3261E", PDRM: "#1F5C99", JBPM: "#D9720A" };
  return colors[authStore.user?.agency] || "#64716F";
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

// A mobile browser often resumes a backgrounded tab from memory rather than
// reloading it, so no API request fires to let the response interceptor
// catch an expired token — checking the token's own exp claim on mount and
// whenever the tab regains focus catches that case too. Full reload (not a
// router push) matches how the interceptor itself already logs out, so both
// paths leave the app in the same clean, freshly-initialized state.
const checkTokenExpiry = () => {
  if (authStore.isLoggedIn && authStore.isTokenExpired) {
    authStore.logout();
    window.location.href = "/login";
  }
};
const handleVisibilityChange = () => { if (document.visibilityState === "visible") checkTokenExpiry(); };
onMounted(() => {
  checkTokenExpiry();
  document.addEventListener("visibilitychange", handleVisibilityChange);
});
onUnmounted(() => document.removeEventListener("visibilitychange", handleVisibilityChange));

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
