<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Cases</h2>

    <div class="flex gap-3 mb-4">
      <select v-if="isSuperAdmin" v-model="agencyFilter" class="border rounded px-3 py-1.5 text-sm">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>

      <select v-model="statusFilter" class="border rounded px-3 py-1.5 text-sm">
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="dispatched">Dispatched</option>
        <option value="in_progress">In Progress</option>
        <option value="closed">Closed</option>
      </select>
    </div>

    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500">
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('caseNumber')">Case # {{ sortIndicator('caseNumber') }}</th>
          <th class="py-2 pr-4">Agency</th>
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('category')">Category {{ sortIndicator('category') }}</th>
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('priority')">Priority {{ sortIndicator('priority') }}</th>
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
          <th class="py-2 pr-4">Location</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in cases" :key="c.id" class="border-b border-gray-100 hover:bg-gray-50">
          <td class="py-2 pr-4 font-medium">{{ c.caseNumber }}</td>
          <td class="py-2 pr-4">{{ c.Agency?.code }}</td>
          <td class="py-2 pr-4">{{ c.category }}</td>
          <td class="py-2 pr-4 capitalize">{{ c.priority }}</td>
          <td class="py-2 pr-4">
            <span class="px-2 py-0.5 rounded-full text-xs" :class="statusColor(c.status)">{{ c.status }}</span>
          </td>
          <td class="py-2 pr-4 text-gray-600">{{ c.location }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { caseService } from "../services/caseService";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

const cases = ref([]);
const agencyFilter = ref("");
const statusFilter = ref("");
const sortField = ref("createdAt");
const sortOrder = ref("DESC");

const fetchCases = async () => {
  cases.value = await caseService.getAll({
    agencyCode: agencyFilter.value || undefined,
    status: statusFilter.value || undefined,
    sort: sortField.value,
    order: sortOrder.value,
  });
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

const statusColor = (status) => {
  const colors = {
    open: "bg-red-100 text-red-700",
    dispatched: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    closed: "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
};

watch([agencyFilter, statusFilter, sortField, sortOrder], fetchCases);
onMounted(fetchCases);
</script>
