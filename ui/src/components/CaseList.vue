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
        <option value="en_route">En Route</option>
        <option value="on_scene">On Scene</option>
        <option value="closed">Closed</option>
      </select>

      <button
        :disabled="!agencyFilter && !statusFilter"
        @click="resetFilters"
        class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >Reset Filters</button>
    </div>

    <LoadingSpinner v-if="loading" />
    <div v-else class="overflow-x-auto">
    <table class="w-full table-fixed text-sm border-collapse">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500">
          <th class="py-2 pr-4 cursor-pointer select-none w-[12%]" @click="toggleSort('caseNumber')">Case # {{ sortIndicator('caseNumber') }}</th>
          <th class="py-2 pr-4 w-[8%]">Agency</th>
          <th class="py-2 pr-4 cursor-pointer select-none w-[10%]" @click="toggleSort('category')">Category {{ sortIndicator('category') }}</th>
          <th class="py-2 pr-4 cursor-pointer select-none w-[10%]" @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
          <th class="py-2 pr-4 w-[18%]">Station</th>
          <th class="py-2 pr-4 w-[10%]">Vehicle ID</th>
          <th class="py-2 pr-4 w-[32%]">Location</th>
        </tr>
      </thead>
      <tbody v-for="c in cases" :key="c.id" class="group">
        <tr
          class="border-t border-gray-100 transition-colors"
          :class="c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50'"
        >
          <td class="py-2 pr-4 font-medium">{{ c.caseNumber }}</td>
          <td class="py-2 pr-4">{{ c.Agency?.code }}</td>
          <td class="py-2 pr-4">{{ c.category }}</td>
          <td class="py-2 pr-4">
            <span v-if="c.status === 'open' || c.status === 'closed'" class="text-gray-600">{{ c.status }}</span>
            <span v-else class="px-2 py-0.5 rounded-full text-xs" :class="statusColor(c.status)">{{ c.status }}</span>
          </td>
          <td class="py-2 pr-4 text-gray-600">{{ assignedVehicleFor(c)?.Station?.name || "—" }}</td>
          <td class="py-2 pr-4 text-gray-600">{{ assignedVehicleFor(c)?.callSign || "—" }}</td>
          <td class="py-2 pr-4 text-gray-600">{{ c.location }}</td>
        </tr>
        <tr
          class="border-b border-gray-100 bg-slate-50 transition-colors"
          :class="c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50'"
        >
          <td colspan="7" class="pb-1">
            <StatusStepper :status="c.status" :agency-code="c.Agency?.code" />
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { caseService } from "../services/caseService";
import { vehicleService } from "../services/vehicleService";
import { useAuthStore } from "../stores/auth";
import LoadingSpinner from "./LoadingSpinner.vue";
import StatusStepper from "./StatusStepper.vue";

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

const cases = ref([]);
const vehicles = ref([]);
const agencyFilter = defineModel("agencyFilter", { default: "" });
const statusFilter = defineModel("statusFilter", { default: "" });
const sortField = ref("createdAt");
const sortOrder = ref("DESC");
const loading = ref(true);
let pollInterval;

const fetchCases = async () => {
  cases.value = await caseService.getAll({
    agencyCode: agencyFilter.value || undefined,
    status: statusFilter.value || undefined,
    sort: sortField.value,
    order: sortOrder.value,
  });
  loading.value = false;
};

const fetchVehicles = async () => {
  vehicles.value = await vehicleService.getAll();
};

const assignedVehicleFor = (c) => vehicles.value.find((v) => v.id === c.vehicleId);

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
    dispatched: "bg-yellow-100 text-yellow-700",
    en_route: "bg-orange-100 text-orange-700",
    on_scene: "bg-blue-100 text-blue-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
};

const resetFilters = () => {
  agencyFilter.value = "";
  statusFilter.value = "";
};

watch([agencyFilter, statusFilter, sortField, sortOrder], fetchCases);
onMounted(() => {
  fetchCases();
  fetchVehicles();
  pollInterval = setInterval(() => {
    fetchCases();
    fetchVehicles();
  }, 5000);
});
onUnmounted(() => {
  clearInterval(pollInterval);
});
</script>
