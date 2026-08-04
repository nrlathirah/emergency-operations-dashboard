<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">User Management</h2>

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

    <LoadingSpinner v-if="loading" />
    <template v-else>
      <div class="overflow-x-auto">
      <table class="w-full min-w-[600px] text-sm border-collapse">
        <thead>
          <tr class="border-b border-gray-200 text-left text-gray-500">
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('name')">Name {{ sortIndicator('name') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('email')">Email {{ sortIndicator('email') }}</th>
            <th class="py-2 pr-4 whitespace-nowrap">Agency</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('role')">Role {{ sortIndicator('role') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-2 pr-4 font-medium whitespace-nowrap">{{ u.name }}</td>
            <td class="py-2 pr-4 text-gray-600 whitespace-nowrap">{{ u.email }}</td>
            <td class="py-2 pr-4 whitespace-nowrap">{{ u.Agency?.code }}</td>
            <td class="py-2 pr-4 capitalize whitespace-nowrap">{{ u.role }}</td>
            <td class="py-2 pr-4 whitespace-nowrap">
              <span
                class="px-2 py-0.5 rounded-full text-xs"
                :class="u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
              >{{ u.status }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { userService } from "../services/userService";
import { useAuthStore } from "../stores/auth";
import LoadingSpinner from "./LoadingSpinner.vue";

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

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

const fetchUsers = async () => {
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
  loading.value = false;
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

watch([search, agencyFilter, sortField, sortOrder], () => {
  page.value = 1;
  fetchUsers();
});
watch(page, fetchUsers);

onMounted(fetchUsers);
</script>
