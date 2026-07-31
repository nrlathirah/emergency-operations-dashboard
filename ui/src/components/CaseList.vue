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
    </div>

    <LoadingSpinner v-if="loading" />
    <table v-else class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500">
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('caseNumber')">Case # {{ sortIndicator('caseNumber') }}</th>
          <th class="py-2 pr-4">Agency</th>
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('category')">Category {{ sortIndicator('category') }}</th>
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('priority')">Priority {{ sortIndicator('priority') }}</th>
          <th class="py-2 pr-4 cursor-pointer select-none" @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
          <th class="py-2 pr-4">Elapsed</th>
          <th class="py-2 pr-4">Location</th>
          <th class="py-2 pr-4">Dispatch</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="c in cases"
          :key="c.id"
          class="border-b border-gray-100 hover:bg-gray-50"
          :class="{ 'bg-red-50': isOverdue(c) }"
        >
          <td class="py-2 pr-4 font-medium">{{ c.caseNumber }}</td>
          <td class="py-2 pr-4">{{ c.Agency?.code }}</td>
          <td class="py-2 pr-4">{{ c.category }}</td>
          <td class="py-2 pr-4 capitalize">{{ c.priority }}</td>
          <td class="py-2 pr-4">
            <span class="px-2 py-0.5 rounded-full text-xs" :class="statusColor(c.status)">{{ c.status }}</span>
          </td>
          <td class="py-2 pr-4">
            <span :class="isOverdue(c) ? 'text-red-600 font-semibold' : 'text-gray-500'">
              {{ formatElapsed(c.createdAt) }}
              <span v-if="isOverdue(c)">⚠ Overdue</span>
            </span>
          </td>
          <td class="py-2 pr-4 text-gray-600">{{ c.location }}</td>
          <td class="py-2 pr-4">
            <button
              v-if="c.status === 'open'"
              :disabled="availableVehiclesFor(c).length === 0"
              @click="handleDispatch(c)"
              class="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
              :title="availableVehiclesFor(c).length ? `Nearest: ${availableVehiclesFor(c)[0].callSign} (${availableVehiclesFor(c)[0].distanceKm.toFixed(1)} km)` : 'No available vehicles'"
            >Dispatch Nearest</button>
            <span v-else class="text-gray-400 text-xs">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { caseService } from "../services/caseService";
import { vehicleService } from "../services/vehicleService";
import { useAuthStore } from "../stores/auth";
import LoadingSpinner from "./LoadingSpinner.vue";

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

const cases = ref([]);
const vehicles = ref([]);
const agencyFilter = ref("");
const statusFilter = ref("");
const sortField = ref("createdAt");
const sortOrder = ref("DESC");
const now = ref(Date.now());
const loading = ref(true);
let clockInterval;
let pollInterval;

const SLA_MINUTES = { high: 5, medium: 15, low: 30 };

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

const elapsedMinutes = (createdAt) => (now.value - new Date(createdAt).getTime()) / 60000;

const formatElapsed = (createdAt) => {
  const mins = Math.floor(elapsedMinutes(createdAt));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

const isOverdue = (c) => {
  if (c.status !== "open") return false;
  const threshold = SLA_MINUTES[c.priority] ?? 30;
  return elapsedMinutes(c.createdAt) > threshold;
};

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const availableVehiclesFor = (c) => {
  return vehicles.value
    .filter((v) => v.status === "available" && v.Agency?.code === c.Agency?.code)
    .map((v) => ({
      ...v,
      distanceKm: haversineDistanceKm(c.latitude, c.longitude, v.latitude, v.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

const handleDispatch = async (caseRecord) => {
  const nearest = availableVehiclesFor(caseRecord)[0];
  if (!nearest) return;
  try {
    await caseService.dispatch(caseRecord.id, nearest.id);
    await fetchCases();
    await fetchVehicles();
  } catch (err) {
    alert(err.response?.data?.message || "Failed to dispatch");
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

const statusColor = (status) => {
  const colors = {
    open: "bg-red-100 text-red-700",
    dispatched: "bg-yellow-100 text-yellow-700",
    en_route: "bg-orange-100 text-orange-700",
    on_scene: "bg-blue-100 text-blue-700",
    closed: "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
};

watch([agencyFilter, statusFilter, sortField, sortOrder], fetchCases);
onMounted(() => {
  fetchCases();
  fetchVehicles();
  clockInterval = setInterval(() => {
    now.value = Date.now();
  }, 30000);
  pollInterval = setInterval(() => {
    fetchCases();
    fetchVehicles();
  }, 5000);
});
onUnmounted(() => {
  clearInterval(clockInterval);
  clearInterval(pollInterval);
});
</script>
