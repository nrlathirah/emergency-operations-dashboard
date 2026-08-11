<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
      <h2 class="text-lg font-semibold">User Management</h2>
      <button
        type="button"
        @click="openAddUser"
        class="px-3 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer transition"
      >+ Add User</button>
    </div>

    <div class="flex flex-wrap gap-3 mb-4">
      <input
        v-model="search"
        type="text"
        placeholder="Search by name or email..."
        class="border rounded px-3 py-1.5 text-sm flex-1 min-w-[180px] max-w-xs"
      />
      <select v-if="isSuperAdmin" v-model="agencyFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>
    </div>

    <p v-if="error && users.length > 0" class="text-xs text-red-500 mb-2">⚠️ {{ error }} Showing last loaded data.</p>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error && users.length === 0" :message="error" @retry="fetchUsers" />
    <template v-else>
      <div class="overflow-x-auto">
      <table class="w-full min-w-[650px] text-sm border-collapse">
        <thead>
          <tr class="border-b border-gray-200 text-left text-gray-500">
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('name')">Name {{ sortIndicator('name') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('email')">Email {{ sortIndicator('email') }}</th>
            <th class="py-2 pr-4 whitespace-nowrap">Agency</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('role')">Role {{ sortIndicator('role') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
            <th class="py-2 pr-4 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-2 pr-4 font-medium whitespace-nowrap">{{ u.name }}</td>
            <td class="py-2 pr-4 text-gray-600 whitespace-nowrap">{{ u.email }}</td>
            <td class="py-2 pr-4 whitespace-nowrap">{{ u.Agency?.code || "—" }}</td>
            <td class="py-2 pr-4 capitalize whitespace-nowrap">{{ u.role }}</td>
            <td class="py-2 pr-4 whitespace-nowrap">
              <span
                class="px-2 py-0.5 rounded-full text-xs"
                :class="u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
              >{{ u.status }}</span>
            </td>
            <td class="py-2 pr-4 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  :disabled="togglingId === u.id"
                  @click="toggleStatus(u)"
                  class="text-xs font-medium hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-default"
                  :class="u.status === 'active' ? 'text-red-600' : 'text-teal-600'"
                >{{ togglingId === u.id ? "…" : (u.status === "active" ? "Deactivate" : "Activate") }}</button>
                <button
                  type="button"
                  @click="openResetPassword(u)"
                  class="text-xs font-medium text-gray-600 hover:underline cursor-pointer"
                >Reset Password</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <div class="flex items-center gap-3 mt-4 text-sm">
        <button
          :disabled="page === 1"
          @click="page--"
          class="px-3 py-1 border rounded cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-gray-50"
        >Previous</button>
        <span class="text-gray-600">Page {{ page }} of {{ totalPages }}</span>
        <button
          :disabled="page === totalPages"
          @click="page++"
          class="px-3 py-1 border rounded cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-gray-50"
        >Next</button>
      </div>
    </template>

    <!-- Add User modal -->
    <div v-if="showAddUser" class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <template v-if="!createdCredentials">
          <h3 class="text-base font-semibold mb-4">Add User</h3>
          <form @submit.prevent="handleAddUser" class="space-y-3">
            <div>
              <label class="block text-xs text-gray-600 mb-1">Name</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Email</label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Temporary Password</label>
              <div class="flex gap-2">
                <PasswordInput v-model="form.password" required minlength="6" class="flex-1" />
                <button
                  type="button"
                  @click="form.password = generateTempPassword()"
                  title="Generate a new one"
                  class="px-2.5 border rounded text-sm hover:bg-gray-50 cursor-pointer flex-shrink-0"
                >🔄</button>
              </div>
              <p class="text-[11px] text-gray-400 mt-1">Auto-generated — you'll share this with the user after creating. They'll be required to set their own on first login.</p>
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Role</label>
              <select
                v-model="form.role"
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm cursor-pointer"
              >
                <option value="staff">Staff</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div v-if="form.role !== 'super_admin'">
              <label class="block text-xs text-gray-600 mb-1">Agency</label>
              <select
                v-model="form.agencyCode"
                required
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm cursor-pointer"
              >
                <option value="" disabled>Select agency</option>
                <option value="KKM">KKM</option>
                <option value="PDRM">PDRM</option>
                <option value="JBPM">JBPM</option>
              </select>
            </div>

            <p v-if="formError" class="text-red-600 text-xs">{{ formError }}</p>

            <div class="flex gap-2 pt-2">
              <button
                type="button"
                @click="closeAddUser"
                class="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 cursor-pointer"
              >Cancel</button>
              <button
                type="submit"
                :disabled="submitting"
                class="flex-1 px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
              >{{ submitting ? "Adding…" : "Add User" }}</button>
            </div>
          </form>
        </template>

        <!-- Shown once, right after creation — this password is never
             retrievable again since it's only ever stored as a hash. -->
        <template v-else>
          <h3 class="text-base font-semibold mb-1">✅ User Created</h3>
          <p class="text-xs text-gray-500 mb-3">Share this temporary password with {{ createdCredentials.name }} now — it won't be shown again.</p>
          <div class="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2 mb-2">
            <code class="flex-1 text-sm font-mono">{{ createdCredentials.password }}</code>
            <button
              type="button"
              @click="copyPassword(createdCredentials.password)"
              class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer flex-shrink-0 transition"
              :class="copied ? 'bg-teal-600 text-white' : 'border border-teal-600 text-teal-600 hover:bg-teal-50'"
            >{{ copied ? "Copied!" : "📋 Copy" }}</button>
          </div>
          <p class="text-[11px] text-amber-600 mb-4">⚠️ Copy it now — if lost, you'll need to reset this user's password again to get a new one.</p>
          <button
            type="button"
            @click="closeAddUser"
            class="w-full px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer"
          >Done</button>
        </template>
      </div>
    </div>

    <!-- Reset Password modal -->
    <div v-if="resetTarget" class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <template v-if="!resetCredentials">
          <h3 class="text-base font-semibold mb-1">Reset Password</h3>
          <p class="text-xs text-gray-500 mb-4">Set a new temporary password for {{ resetTarget.name }}. They'll be required to set their own on next login.</p>
          <form @submit.prevent="handleResetPassword" class="space-y-3">
            <div>
              <label class="block text-xs text-gray-600 mb-1">New Temporary Password</label>
              <div class="flex gap-2">
                <PasswordInput v-model="resetPasswordValue" required minlength="6" class="flex-1" />
                <button
                  type="button"
                  @click="resetPasswordValue = generateTempPassword()"
                  title="Generate a new one"
                  class="px-2.5 border rounded text-sm hover:bg-gray-50 cursor-pointer flex-shrink-0"
                >🔄</button>
              </div>
            </div>

            <p v-if="resetError" class="text-red-600 text-xs">{{ resetError }}</p>

            <div class="flex gap-2 pt-2">
              <button
                type="button"
                @click="closeResetPassword"
                class="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 cursor-pointer"
              >Cancel</button>
              <button
                type="submit"
                :disabled="resetting"
                class="flex-1 px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
              >{{ resetting ? "Resetting…" : "Reset Password" }}</button>
            </div>
          </form>
        </template>

        <template v-else>
          <h3 class="text-base font-semibold mb-1">✅ Password Reset</h3>
          <p class="text-xs text-gray-500 mb-3">Share this temporary password with {{ resetTarget.name }} now — it won't be shown again.</p>
          <div class="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2 mb-2">
            <code class="flex-1 text-sm font-mono">{{ resetCredentials }}</code>
            <button
              type="button"
              @click="copyPassword(resetCredentials)"
              class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer flex-shrink-0 transition"
              :class="copied ? 'bg-teal-600 text-white' : 'border border-teal-600 text-teal-600 hover:bg-teal-50'"
            >{{ copied ? "Copied!" : "📋 Copy" }}</button>
          </div>
          <p class="text-[11px] text-amber-600 mb-4">⚠️ Copy it now — if lost, you'll need to reset this user's password again to get a new one.</p>
          <button
            type="button"
            @click="closeResetPassword"
            class="w-full px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer"
          >Done</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { userService } from "../services/userService";
import { useAuthStore } from "../stores/auth";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";
import PasswordInput from "./PasswordInput.vue";

// Readable temp password (e.g. "Welcome4821") — easy for an admin to relay
// verbally or by message. Never persisted in plaintext; only shown once
// right after creation/reset, since the DB only ever stores the bcrypt hash.
const generateTempPassword = () => `Welcome${Math.floor(1000 + Math.random() * 9000)}`;

const copied = ref(false);
const copyPassword = async (value) => {
  await navigator.clipboard.writeText(value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

const users = ref([]);
const search = ref("");
const agencyFilter = ref("");
const sortField = ref("name");
const sortOrder = ref("ASC");
const page = ref(1);
const limit = 5;
const total = ref(0);
const loading = ref(true);
const error = ref(null);
const togglingId = ref(null);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

const fetchUsers = async () => {
  try {
    const result = await userService.getAll({
      search: search.value || undefined,
      agencyCode: agencyFilter.value || undefined,
      sort: sortField.value,
      order: sortOrder.value,
      page: page.value,
      limit,
    });
    users.value = result.data;
    total.value = result.total;
    error.value = null;
  } catch (err) {
    error.value = "Failed to load users.";
  } finally {
    loading.value = false;
  }
};

const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === "ASC" ? "DESC" : "ASC";
  } else {
    sortField.value = field;
    sortOrder.value = "ASC";
  }
};

const sortIndicator = (field) =>
  sortField.value === field ? (sortOrder.value === "ASC" ? "▲" : "▼") : "";

// Flips a user's active/inactive status — enforced server-side too (a
// deactivated account is rejected at login, not just hidden in the UI).
const toggleStatus = async (u) => {
  togglingId.value = u.id;
  try {
    await userService.updateStatus(u.id, u.status === "active" ? "inactive" : "active");
    await fetchUsers();
  } catch (err) {
    error.value = "Failed to update user status.";
  } finally {
    togglingId.value = null;
  }
};

const showAddUser = ref(false);
const submitting = ref(false);
const formError = ref("");
const createdCredentials = ref(null);
const emptyForm = () => ({ name: "", email: "", password: generateTempPassword(), role: "staff", agencyCode: "" });
const form = ref(emptyForm());

const openAddUser = () => {
  form.value = emptyForm();
  formError.value = "";
  createdCredentials.value = null;
  showAddUser.value = true;
};

const closeAddUser = () => {
  showAddUser.value = false;
  createdCredentials.value = null;
};

const handleAddUser = async () => {
  formError.value = "";
  submitting.value = true;
  try {
    await userService.create({
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
      agencyCode: form.value.role === "super_admin" ? undefined : form.value.agencyCode,
    });
    createdCredentials.value = { name: form.value.name, password: form.value.password };
    page.value = 1;
    await fetchUsers();
  } catch (err) {
    formError.value = err.response?.data?.message || "Failed to add user.";
  } finally {
    submitting.value = false;
  }
};

const resetTarget = ref(null);
const resetPasswordValue = ref("");
const resetError = ref("");
const resetting = ref(false);
const resetCredentials = ref(null);

const openResetPassword = (u) => {
  resetTarget.value = u;
  resetPasswordValue.value = generateTempPassword();
  resetError.value = "";
  resetCredentials.value = null;
};

const closeResetPassword = () => {
  resetTarget.value = null;
  resetCredentials.value = null;
};

const handleResetPassword = async () => {
  resetError.value = "";
  resetting.value = true;
  try {
    await userService.resetPassword(resetTarget.value.id, resetPasswordValue.value);
    resetCredentials.value = resetPasswordValue.value;
  } catch (err) {
    resetError.value = err.response?.data?.message || "Failed to reset password.";
  } finally {
    resetting.value = false;
  }
};

watch([search, agencyFilter, sortField, sortOrder], () => {
  page.value = 1;
  fetchUsers();
});
watch(page, fetchUsers);

onMounted(fetchUsers);
</script>
