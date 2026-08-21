<template>
  <div class="rb-panel rb-cases-panel flex flex-col" :style="props.matchHeight ? { '--match-height': `${props.matchHeight}px` } : {}">
    <div class="rb-panel-head">
      <div>
        <h2>
          Cases
          <span class="rb-live-dot" style="margin-left: 8px; margin-right: 5px;"></span>
          <span style="font-size: 0.6875rem; font-weight: 700; color: var(--pri-low); text-transform: uppercase; letter-spacing: 0.04em; vertical-align: 2px;">Live</span>
        </h2>
        <p class="rb-panel-meta">Showing active cases and cases closed in the last 24h — see Reports for full history.</p>
      </div>
      <span class="rb-panel-meta">{{ activeCount }} Active · {{ closedCount }} Closed</span>
    </div>

    <div class="rb-filter-row">
      <select v-if="isSuperAdmin" v-model="agencyFilter" class="rb-scope-select">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>

      <select v-model="statusFilter" class="rb-scope-select">
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
        class="rb-daterange-preset"
        :class="{ 'rb-daterange-preset--active': activeOnly }"
      >Active Cases</button>

      <button
        v-if="hasActiveFilters"
        type="button"
        @click="resetFilters"
        class="rb-reset-link"
      >✕ Reset Filters</button>

      <button
        type="button"
        :disabled="simulating"
        @click="handleSimulate"
        class="rb-btn-export rb-tooltip-target rb-tooltip-target--align-right"
        style="margin-left: auto;"
        data-tooltip="Creates a fake demo case for testing — not a real incident report"
      >{{ simulating ? "Simulating…" : "Simulate New Case" }}</button>
    </div>

    <!-- Brief heads-up toast when a simulated case is created — auto-dismisses, no action needed.
         z-index is far above Leaflet's own panes/controls (which reach ~1000), so it doesn't get
         rendered behind the map when the two overlap. -->
    <div
      v-if="simulateToast"
      class="fixed top-4 right-4 bg-white dark:bg-gray-100 border border-gray-200 shadow-lg rounded-lg text-sm max-w-xs"
      style="z-index: 9999;"
    >
      <div class="px-4 py-3">
        <span
          class="inline-block text-[10px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full mb-1.5"
          :style="{ backgroundColor: simulateToast.isError ? '#ef4444' : AGENCY_COLORS[simulateToast.agencyCode] || '#0C6E72' }"
        >{{ simulateToast.isError ? "Error" : simulateToast.agencyCode }}</span>
        <p class="font-medium text-gray-800">{{ simulateToast.title }}</p>
        <p v-if="simulateToast.detail" class="text-gray-500 text-xs mt-0.5">{{ simulateToast.detail }}</p>
        <div class="flex items-center gap-2 mt-2.5">
          <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              ref="toastProgressRef"
              class="h-full rounded-full"
              :style="{ backgroundColor: simulateToast.isError ? '#ef4444' : '#0C6E72' }"
            ></div>
          </div>
          <span class="text-[11px] text-gray-400 tabular-nums w-6 text-right">{{ toastCountdown }}s</span>
        </div>
      </div>
    </div>

    <p v-if="error && cases.length > 0" class="text-xs text-red-500 mb-2">⚠️ {{ error }} Showing last loaded data.</p>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error && cases.length === 0" :message="error" @retry="fetchCases" />
    <div v-else class="flex-1 overflow-y-auto rb-table-scroll">
    <table class="rb-manifest rb-cases-table">
      <thead>
        <tr>
          <th class="sortable" @click="toggleSort('caseNumber')">Case ID {{ sortIndicator('caseNumber') }}</th>
          <th class="sortable" @click="toggleSort('createdAt')">Created {{ sortIndicator('createdAt') }}</th>
          <th class="sortable" @click="toggleSort('vehicle')">Vehicle ID {{ sortIndicator('vehicle') }}</th>
          <th class="sortable" @click="toggleSort('station')">Station {{ sortIndicator('station') }}</th>
        </tr>
      </thead>
      <tbody v-if="displayCases.length === 0">
        <tr>
          <td colspan="4" class="rb-empty">
            <p>No cases found matching your filters.</p>
            <button v-if="hasActiveFilters" type="button" @click="resetFilters" class="rb-reset-link mt-2">Clear filters</button>
          </td>
        </tr>
      </tbody>
      <tbody
        v-for="c in pagedCases"
        :key="c.id"
        :ref="(el) => registerRowRef(c.id, el)"
        class="group"
      >
        <tr
          class="transition-colors"
          :class="[
            c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30',
            { 'bg-yellow-100 dark:bg-amber-900/40': highlightedCaseId === c.id },
          ]"
        >
          <td class="rb-case-id">
            <div>
              {{ c.caseNumber }}
              <span v-if="isNew(c)" class="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-white bg-teal-600 px-1.5 py-0.5 rounded-full align-middle">New</span>
            </div>
            <button
              v-if="c.status !== 'closed'"
              type="button"
              @click="emit('show-on-map', c.id)"
              class="text-teal-600 hover:underline text-xs font-normal cursor-pointer"
            >Show on map</button>
          </td>
          <td class="tabular">
            <div>{{ formatCreatedAt(c.createdAt) }}</div>
            <div v-if="c.status !== 'closed'" class="text-xs text-gray-400">{{ formatDuration(c.createdAt) }}</div>
          </td>
          <td>{{ assignedVehicleFor(c)?.callSign || "—" }}</td>
          <td>{{ assignedVehicleFor(c)?.Station?.name || "—" }}</td>
        </tr>
        <tr
          class="transition-colors"
          :class="[
            c.status === 'closed' ? 'opacity-60 group-hover:bg-gray-200' : 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30',
            highlightedCaseId === c.id ? 'bg-yellow-100 dark:bg-amber-900/40' : 'bg-gray-50',
          ]"
        >
          <td colspan="4" class="pb-3 pt-1 px-3" style="max-width: none;">
            <StatusStepper :status="c.status" />
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <div v-if="!loading" class="rb-table-foot">
      <span>Showing {{ rangeStart }}–{{ rangeEnd }} of {{ displayCases.length }} cases</span>
      <div class="rb-pager">
        <label>Per page
          <select v-model.number="pageSize">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </label>
        <button :disabled="page === 1" @click="page--">Previous</button>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <button :disabled="page === totalPages" @click="page++">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { caseService } from "../services/caseService";
import { vehicleService } from "../services/vehicleService";
import { useAuthStore } from "../stores/auth";
import { formatDateTime } from "../utils/formatDate";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";
import StatusStepper from "./StatusStepper.vue";

const props = defineProps({
  // Composite "id:timestamp" string — the timestamp guarantees a fresh value
  // even when the same case is clicked twice in a row, so the watcher fires.
  focusedCaseId: { type: String, default: null },
  // The map panel's real measured height in px (DashboardPage, fed from
  // VehicleMap's own ResizeObserver) — only actually applied at >=1024px
  // by the CSS itself (see .rb-cases-panel), so it's harmless to keep
  // passing this at any width.
  matchHeight: { type: Number, default: null },
});

// Matches the agency colors used on the map/legend elsewhere in the app.
const AGENCY_COLORS = { KKM: "#B3261E", PDRM: "#1F5C99", JBPM: "#D9720A" };

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
const error = ref(null);
const highlightedCaseId = ref(null);
const rowRefs = {};
let pollInterval;
let highlightTimeout;
const simulating = ref(false);
const simulateToast = ref(null);
const toastProgressRef = ref(null);
const toastCountdown = ref(60);
let simulateToastTimeout;
let toastCountdownInterval;

const registerRowRef = (id, el) => {
  if (el) rowRefs[id] = el;
  else delete rowRefs[id]; // row scrolled off the current page and unmounted
};

const fetchCases = async () => {
  try {
    cases.value = await caseService.getAll({
      agencyCode: agencyFilter.value || undefined,
      status: statusFilter.value || undefined,
    });
    error.value = null;
  } catch (err) {
    error.value = "Failed to load cases.";
  } finally {
    loading.value = false;
  }
};

const fetchVehicles = async () => {
  try {
    vehicles.value = await vehicleService.getAll();
  } catch (err) {
    // Non-critical — the table still renders fine without vehicle enrichment,
    // just falling back to "—" for Station/Vehicle ID.
    console.error("Failed to load vehicles:", err);
  }
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
    case "createdAt": return new Date(c.createdAt).getTime();
    case "station": return assignedVehicleFor(c)?.Station?.name || "";
    case "vehicle": return assignedVehicleFor(c)?.callSign || "";
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

const pageSize = ref(10);
const page = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(displayCases.value.length / pageSize.value)));
const pagedCases = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return displayCases.value.slice(start, start + pageSize.value);
});
const rangeStart = computed(() => (displayCases.value.length === 0 ? 0 : (page.value - 1) * pageSize.value + 1));
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, displayCases.value.length));

const formatCreatedAt = (createdAt) => formatDateTime(createdAt, { includeYear: false });

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

// Re-evaluated on every render, so the badge naturally disappears once the
// case ages past 5 minutes — no separate timer needed since the 5s poll
// already re-renders the table regularly.
const NEW_THRESHOLD_MS = 5 * 60 * 1000;
const isNew = (c) => Date.now() - new Date(c.createdAt).getTime() < NEW_THRESHOLD_MS;

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

const hasActiveFilters = computed(() => !!(agencyFilter.value || statusFilter.value || activeOnly.value));

const resetFilters = () => {
  agencyFilter.value = "";
  statusFilter.value = "";
  activeOnly.value = false;
};

const TOAST_DURATION_MS = 60000;
const TOAST_DURATION_S = TOAST_DURATION_MS / 1000;

const showSimulateToast = (toast) => {
  simulateToast.value = toast;
  clearTimeout(simulateToastTimeout);
  simulateToastTimeout = setTimeout(() => {
    simulateToast.value = null;
    clearInterval(toastCountdownInterval);
  }, TOAST_DURATION_MS);

  clearInterval(toastCountdownInterval);
  toastCountdown.value = TOAST_DURATION_S;
  toastCountdownInterval = setInterval(() => {
    toastCountdown.value = Math.max(0, toastCountdown.value - 1);
    if (toastCountdown.value === 0) clearInterval(toastCountdownInterval);
  }, 1000);

  // Drive the progress bar manually (rather than a CSS transition triggered
  // by a class/data change) so it reliably restarts from 100% even if a
  // second toast replaces the first while one is still animating.
  nextTick(() => {
    const bar = toastProgressRef.value;
    if (!bar) return;
    bar.style.transition = "none";
    bar.style.width = "100%";
    void bar.offsetWidth; // force a reflow so the browser registers the reset before animating
    bar.style.transition = `width ${TOAST_DURATION_MS}ms linear`;
    bar.style.width = "0%";
  });
};

const handleSimulate = async () => {
  simulating.value = true;
  try {
    const result = await caseService.simulate();
    showSimulateToast({
      title: `New case reported: ${result.caseNumber}`,
      detail: "Will progress through its stages automatically over the next minute.",
      agencyCode: result.agencyCode,
    });
    await fetchCases();
  } catch (err) {
    showSimulateToast({
      title: "Couldn't simulate a new case",
      detail: err.response?.data?.message || "Please try again.",
      isError: true,
    });
  } finally {
    simulating.value = false;
  }
};

// Triggered when a marker is clicked on the map — clears any table filter
// that would hide the case, jumps to whichever page the case now falls on,
// then scrolls to and briefly highlights its row.
const jumpToCase = async (caseId) => {
  agencyFilter.value = "";
  statusFilter.value = "";
  activeOnly.value = false;
  await fetchCases();
  await nextTick();

  const index = displayCases.value.findIndex((c) => c.id === caseId);
  if (index !== -1) {
    page.value = Math.floor(index / pageSize.value) + 1;
    await nextTick();
  }

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

// Picking a specific status from the dropdown overrides "Active Cases" —
// the two would otherwise conflict (e.g. status=closed + non-closed-only).
watch(statusFilter, (value) => {
  if (value) activeOnly.value = false;
});

watch([agencyFilter, statusFilter], fetchCases);

// Jump back to page 1 whenever the filtered/sorted set changes shape, and
// clamp down if a background poll shrinks the result set out from under
// whatever page the user was on (e.g. a case's status moved it out of view).
watch([agencyFilter, statusFilter, activeOnly, sortField, sortOrder, pageSize], () => {
  page.value = 1;
});
watch(totalPages, () => {
  if (page.value > totalPages.value) page.value = totalPages.value;
});

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
  clearTimeout(simulateToastTimeout);
  clearInterval(toastCountdownInterval);
});
</script>
