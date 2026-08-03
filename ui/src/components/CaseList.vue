<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Cases</h2>

    <div class="flex gap-3 mb-4">
      <select v-if="isSuperAdmin" v-model="agencyFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>

      <select v-model="statusFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
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
        class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-600 cursor-pointer disabled:opacity-40 disabled:cursor-default"
      >Reset Filters</button>
    </div>

    <LoadingSpinner v-if="loading" />
    <div v-else class="overflow-x-auto">
    <table class="w-full min-w-[900px] text-sm border-collapse">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500">
          <th class="py-3 px-6 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('caseNumber')">Case # {{ sortIndicator('caseNumber') }}</th>
          <th class="py-3 px-6 whitespace-nowrap">Agency</th>
          <th class="py-3 px-6 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('createdAt')">Created {{ sortIndicator('createdAt') }}</th>
          <th class="py-3 px-6 whitespace-nowrap">Station</th>
          <th class="py-3 px-6 whitespace-nowrap">Vehicle ID</th>
          <th class="py-3 px-6 w-full">Location</th>
          <th class="py-3 px-6 whitespace-nowrap">Map</th>
        </tr>
      </thead>
      <tbody
        v-for="c in displayCases"
        :key="c.id"
        :ref="(el) => registerRowRef(c.id, el)"
        class="group"
      >
        <tr
          class="border-t border-gray-100 transition-colors"
          :class="[
            c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50',
            { 'bg-yellow-100': highlightedCaseId === c.id },
          ]"
        >
          <td class="py-3 px-6 font-medium whitespace-nowrap">{{ c.caseNumber }}</td>
          <td class="py-3 px-6 whitespace-nowrap">{{ c.Agency?.code }}</td>
          <td class="py-3 px-6 text-gray-600 whitespace-nowrap">{{ formatCreatedAt(c.createdAt) }}</td>
          <td class="py-3 px-6 text-gray-600 whitespace-nowrap">{{ assignedVehicleFor(c)?.Station?.name || "—" }}</td>
          <td class="py-3 px-6 text-gray-600 whitespace-nowrap">{{ assignedVehicleFor(c)?.callSign || "—" }}</td>
          <td class="py-3 px-6 text-gray-600">{{ c.location }}</td>
          <td class="py-3 px-6 whitespace-nowrap">
            <button
              v-if="c.status !== 'closed'"
              type="button"
              @click="emit('show-on-map', c.id)"
              class="text-blue-600 hover:underline text-xs font-medium cursor-pointer"
            >Show on map</button>
            <span v-else class="text-gray-400 text-xs">—</span>
          </td>
        </tr>
        <tr
          class="border-b border-gray-100 transition-colors"
          :class="[
            c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50',
            highlightedCaseId === c.id ? 'bg-yellow-100' : 'bg-slate-50',
          ]"
        >
          <td colspan="7" class="pb-3 pt-1 px-6">
            <StatusStepper :status="c.status" :agency-code="c.Agency?.code" />
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { caseService } from "../services/caseService";
import { vehicleService } from "../services/vehicleService";
import { useAuthStore } from "../stores/auth";
import LoadingSpinner from "./LoadingSpinner.vue";
import StatusStepper from "./StatusStepper.vue";

const props = defineProps({
  // Composite "id:timestamp" string — the timestamp guarantees a fresh value
  // even when the same case is clicked twice in a row, so the watcher fires.
  focusedCaseId: { type: String, default: null },
});

const emit = defineEmits(["show-on-map"]);

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

const cases = ref([]);
const vehicles = ref([]);
const agencyFilter = defineModel("agencyFilter", { default: "" });
const statusFilter = defineModel("statusFilter", { default: "" });
const sortField = ref("createdAt");
const sortOrder = ref("DESC");
const loading = ref(true);
const highlightedCaseId = ref(null);
const rowRefs = {};
let pollInterval;
let highlightTimeout;

const registerRowRef = (id, el) => {
  if (el) rowRefs[id] = el;
};

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

// Open cases always float to the top regardless of the active sort column —
// Array.sort is stable, so within "open" and "non-open" each keeps whatever
// order the backend already returned (e.g. newest-created first by default).
const displayCases = computed(() => {
  return [...cases.value].sort((a, b) => {
    const aOpen = a.status === "open" ? 0 : 1;
    const bOpen = b.status === "open" ? 0 : 1;
    return aOpen - bOpen;
  });
});

const assignedVehicleFor = (c) => vehicles.value.find((v) => v.id === c.vehicleId);

const formatCreatedAt = (createdAt) =>
  new Date(createdAt).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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

const resetFilters = () => {
  agencyFilter.value = "";
  statusFilter.value = "";
};

// Triggered when a marker is clicked on the map — clears any table filter
// that would hide the case, then scrolls to and briefly highlights its row.
const jumpToCase = async (caseId) => {
  agencyFilter.value = "";
  statusFilter.value = "";
  await fetchCases();
  await nextTick();

  const rowEl = rowRefs[caseId];
  if (rowEl) {
    rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  highlightedCaseId.value = caseId;
  clearTimeout(highlightTimeout);
  highlightTimeout = setTimeout(() => {
    highlightedCaseId.value = null;
  }, 2500);
};

watch(() => props.focusedCaseId, (value) => {
  if (!value) return;
  const caseId = Number(value.split(":")[0]);
  jumpToCase(caseId);
});

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
  clearTimeout(highlightTimeout);
});
</script>
