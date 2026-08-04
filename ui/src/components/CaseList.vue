<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-semibold">Cases</h2>
        <span class="flex items-center gap-1 text-[11px] text-green-600 font-medium">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Live
        </span>
      </div>
      <span class="text-xs text-gray-500">{{ activeCount }} Active · {{ closedCount }} Closed</span>
    </div>
    <p class="text-xs text-gray-400 mb-3">Showing active cases and cases closed in the last 24h — see Reports for full history.</p>

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
        type="button"
        @click="toggleActiveOnly"
        class="px-3 py-1.5 text-sm border rounded cursor-pointer transition"
        :class="activeOnly ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700' : 'hover:bg-gray-50 text-gray-600'"
      >Active Only</button>

      <button
        :disabled="!agencyFilter && !statusFilter && !activeOnly"
        @click="resetFilters"
        class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-600 cursor-pointer disabled:opacity-40 disabled:cursor-default"
      >Reset Filters</button>
    </div>

    <LoadingSpinner v-if="loading" />
    <div v-else class="overflow-x-auto">
    <table class="w-full min-w-[900px] text-sm border-collapse">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500">
          <th class="py-3 px-6 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('caseNumber')">Case ID {{ sortIndicator('caseNumber') }}</th>
          <th class="py-3 px-6 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('agency')">Agency {{ sortIndicator('agency') }}</th>
          <th class="py-3 px-6 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('createdAt')">Created {{ sortIndicator('createdAt') }}</th>
          <th class="py-3 px-6 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('station')">Station {{ sortIndicator('station') }}</th>
          <th class="py-3 px-6 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('vehicle')">Vehicle ID {{ sortIndicator('vehicle') }}</th>
          <th class="py-3 px-6 w-full cursor-pointer select-none" @click="toggleSort('location')">Location {{ sortIndicator('location') }}</th>
          <th class="py-3 px-6 whitespace-nowrap">Map</th>
        </tr>
      </thead>
      <tbody v-if="displayCases.length === 0">
        <tr>
          <td colspan="7" class="py-10 text-center text-gray-400 text-sm">No cases found matching your filters.</td>
        </tr>
      </tbody>
      <tbody
        v-for="c in displayCases"
        :key="c.id"
        :ref="(el) => registerRowRef(c.id, el)"
        class="group"
      >
        <tr
          class="border-t-2 border-gray-200 transition-colors"
          :class="[
            c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50',
            { 'bg-yellow-100': highlightedCaseId === c.id },
          ]"
        >
          <td class="py-3 px-6 font-medium whitespace-nowrap">{{ c.caseNumber }}</td>
          <td class="py-3 px-6 whitespace-nowrap">{{ c.Agency?.code }}</td>
          <td class="py-3 px-6 text-gray-600 whitespace-nowrap">
            <div>{{ formatCreatedAt(c.createdAt) }}</div>
            <div v-if="c.status !== 'closed'" class="text-xs text-gray-400">{{ formatDuration(c.createdAt) }}</div>
          </td>
          <td class="py-3 px-6 text-gray-600 whitespace-nowrap">{{ assignedVehicleFor(c)?.Station?.name || "—" }}</td>
          <td class="py-3 px-6 text-gray-600 whitespace-nowrap">{{ assignedVehicleFor(c)?.callSign || "—" }}</td>
          <td class="py-3 px-6 text-gray-600">{{ c.location }}</td>
          <td class="py-3 px-6 whitespace-nowrap">
            <button
              v-if="c.status !== 'closed'"
              type="button"
              @click="emit('show-on-map', c.id)"
              class="text-teal-600 hover:underline text-xs font-medium cursor-pointer"
            >Show on map</button>
            <span v-else class="text-gray-400 text-xs">—</span>
          </td>
        </tr>
        <tr
          class="border-b-2 border-gray-200 transition-colors"
          :class="[
            c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50',
            highlightedCaseId === c.id ? 'bg-yellow-100' : 'bg-slate-50',
          ]"
        >
          <td colspan="7" class="pb-3 pt-1 px-6">
            <StatusStepper :status="c.status" />
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
// Client-side "any non-closed status" filter — separate from statusFilter,
// which only supports one exact status at a time via the dropdown.
const activeOnly = ref(false);
// null sortField means "no explicit sort yet" — falls back to the default
// (latest first). Kept separate from any column's own ASC/DESC value so the
// Created column (which shares its field with the default) can still be
// clicked into ascending/oldest-first instead of only ever landing back on
// the default DESC state.
const sortField = ref(null);
const sortOrder = ref("ASC");
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
  });
  loading.value = false;
};

const fetchVehicles = async () => {
  vehicles.value = await vehicleService.getAll();
};

const assignedVehicleFor = (c) => vehicles.value.find((v) => v.id === c.vehicleId);

// Reflects whatever the current agency/status filters already narrowed down
// to — so picking a single status like "Dispatched" naturally shows all of
// them as "Active" rather than some separately-fetched global count.
const activeCount = computed(() => cases.value.filter((c) => c.status !== "closed").length);
const closedCount = computed(() => cases.value.filter((c) => c.status === "closed").length);

const toggleActiveOnly = () => {
  activeOnly.value = !activeOnly.value;
  if (activeOnly.value) statusFilter.value = "";
};

// Station/Vehicle/Agency aren't columns on the Case table itself (Agency is a
// joined table, Station/Vehicle are resolved client-side via assignedVehicleFor),
// so sorting happens entirely here rather than via the backend — this also
// means it keeps working correctly against whatever the filters return.
const sortValue = (c, field) => {
  switch (field) {
    case "caseNumber": return c.caseNumber;
    case "agency": return c.Agency?.code || "";
    case "createdAt": return new Date(c.createdAt).getTime();
    case "station": return assignedVehicleFor(c)?.Station?.name || "";
    case "vehicle": return assignedVehicleFor(c)?.callSign || "";
    case "location": return c.location || "";
    default: return "";
  }
};

const displayCases = computed(() => {
  const field = sortField.value ?? DEFAULT_SORT_FIELD;
  const order = sortField.value ? sortOrder.value : DEFAULT_SORT_ORDER;
  const dir = order === "ASC" ? 1 : -1;
  const source = activeOnly.value ? cases.value.filter((c) => c.status !== "closed") : cases.value;
  return [...source].sort((a, b) => {
    const va = sortValue(a, field);
    const vb = sortValue(b, field);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
});

const formatCreatedAt = (createdAt) =>
  new Date(createdAt).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// Elapsed time since creation, for active cases — refreshes automatically on
// every 5s poll since fetchCases() replaces the cases array each time.
const formatDuration = (createdAt) => {
  const totalMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ago`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
  return `${minutes}m ago`;
};

const DEFAULT_SORT_FIELD = "createdAt";
const DEFAULT_SORT_ORDER = "DESC";

// 3-click cycle per column: ASC -> DESC -> back to the default sort
// (latest first), rather than toggling ASC/DESC forever.
const toggleSort = (field) => {
  if (sortField.value !== field) {
    sortField.value = field;
    sortOrder.value = "ASC";
    return;
  }
  if (sortOrder.value === "ASC") {
    sortOrder.value = "DESC";
  } else {
    sortField.value = null;
  }
};

const sortIndicator = (field) => {
  const effectiveField = sortField.value ?? DEFAULT_SORT_FIELD;
  if (effectiveField !== field) return "";
  const effectiveOrder = sortField.value ? sortOrder.value : DEFAULT_SORT_ORDER;
  return effectiveOrder === "ASC" ? "▲" : "▼";
};

const resetFilters = () => {
  agencyFilter.value = "";
  statusFilter.value = "";
  activeOnly.value = false;
};

// Triggered when a marker is clicked on the map — clears any table filter
// that would hide the case, then scrolls to and briefly highlights its row.
const jumpToCase = async (caseId) => {
  agencyFilter.value = "";
  statusFilter.value = "";
  activeOnly.value = false;
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

// Picking a specific status from the dropdown overrides "Active Only" —
// the two would otherwise conflict (e.g. status=closed + non-closed-only).
watch(statusFilter, (value) => {
  if (value) activeOnly.value = false;
});

watch([agencyFilter, statusFilter], fetchCases);
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
