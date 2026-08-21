<template>
  <div class="rb-panel">
    <div class="rb-panel-head">
      <div>
        <h2>Case History</h2>
        <p class="rb-panel-meta">Closed cases only — see the Live Dashboard for cases still in progress.</p>
      </div>
      <div class="relative" data-table-menu>
        <button type="button" @click="menuOpen = !menuOpen" class="rb-icon-btn" title="More options" aria-label="More options">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
        <div v-if="menuOpen" class="rb-chart-menu">
          <button type="button" :disabled="exporting" @click="menuOpen = false; handleExport()">{{ exporting ? "Generating…" : "Export to Excel" }}</button>
        </div>
      </div>
    </div>
    <p v-if="exportError" class="text-red-600 text-xs mb-3">{{ exportError }}</p>

    <div class="rb-filter-row">
      <input v-model="searchInput" class="rb-search-input" type="search" placeholder="Search case ID or location…" />
      <!-- Only for super_admin, and only while the page-level Agency select
           above the charts is itself on "All Agencies" — the whole point of
           this one is narrowing the table without losing the all-agency
           view everywhere else; once the page is already scoped to a single
           agency there's only one real choice left here, so it'd just be a
           redundant control taking up space. -->
      <select v-if="isSuperAdmin && !props.agencyCode" v-model="agencyFilter" class="rb-scope-select">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>
      <select v-model="categoryFilter" class="rb-scope-select">
        <option value="">All Categories</option>
        <option v-for="c in CATEGORY_OPTIONS" :key="c" :value="c">{{ capitalize(c) }}</option>
      </select>
      <select v-model="priorityFilter" class="rb-scope-select">
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button v-if="hasActiveFilters" type="button" @click="clearFilters" class="rb-reset-link">✕ Reset Filters</button>
    </div>

    <ErrorBanner v-if="error" :message="error" @retry="fetchPage" />
    <LoadingSpinner v-else-if="loading" />
    <div v-else class="rb-table-scroll">
      <table class="rb-manifest">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('caseNumber')">Case ID {{ sortIndicator("caseNumber") }}</th>
            <th v-if="isSuperAdmin">Agency</th>
            <th class="sortable" @click="toggleSort('category')">Category {{ sortIndicator("category") }}</th>
            <th class="sortable" @click="toggleSort('priority')">Priority {{ sortIndicator("priority") }}</th>
            <th>Location</th>
            <th class="sortable" @click="toggleSort('createdAt')">Created {{ sortIndicator("createdAt") }}</th>
            <th>Resolved In</th>
          </tr>
        </thead>
        <tbody v-if="cases.length === 0">
          <tr>
            <td :colspan="isSuperAdmin ? 7 : 6" class="rb-empty">
              <p>No closed cases found{{ hasActiveFilters ? " matching your filters" : "" }}.</p>
              <button v-if="hasActiveFilters" type="button" @click="clearFilters" class="rb-reset-link mt-2">Clear filters</button>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="c in cases" :key="c.id">
            <td class="rb-case-id">{{ c.caseNumber }}</td>
            <td v-if="isSuperAdmin"><span class="rb-chip-agency" :data-agency="c.Agency?.code">{{ c.Agency?.code || "—" }}</span></td>
            <td class="capitalize">{{ c.category }}</td>
            <td><span class="rb-priority-tag" :data-priority="c.priority"><span class="rb-dot"></span>{{ capitalize(c.priority) }}</span></td>
            <td class="rb-case-loc">{{ c.location }}</td>
            <td class="tabular">{{ formatDateTime(c.createdAt) }}</td>
            <td class="rb-resolved-time tabular">{{ formatDuration(c.createdAt, c.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading" class="rb-table-foot">
      <span>Showing {{ rangeStart }}–{{ rangeEnd }} of {{ total }} cases</span>
      <div class="rb-pager">
        <label class="flex items-center gap-1.5">
          Per page
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
import { ref, computed, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import { buildTimestampedFilename } from "../utils/chartExport";
import { formatDateTime } from "../utils/formatDate";
import { useClickOutside } from "../composables/useClickOutside";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  isSuperAdmin: { type: Boolean, default: false },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  // Pre-resolved ("2026-07-21 to 2026-08-19 (30 days)") — see ReportsPage,
  // which fetches the earliest case on record so this never has to fall
  // back to a vague "All Time" placeholder.
  dateRangeLabel: { type: String, default: null },
});

// "Case History" — closed/resolved cases only. Cases still in progress
// belong on the Live Dashboard, not here, so there's no status filter to
// pick from: this table's whole point is the closed subset.
const STATUS = "closed";

// Mirrors the category pools in api/src/utils/caseGenerator.js — there's no
// endpoint that returns "every category in use," so this list is hand-kept
// in sync with the generator rather than fetched.
const CATEGORY_OPTIONS = [
  "medical", "accident", "cardiac", "respiratory", "trauma", "poisoning",
  "theft", "traffic", "assault", "burglary", "fraud", "public_disturbance",
  "fire", "rescue", "flood", "hazmat", "gas_leak", "tree_fall",
].sort();

const cases = ref([]);
const total = ref(0);
const loading = ref(true);
const error = ref(null);
const exporting = ref(false);
const exportError = ref("");
const menuOpen = ref(false);
useClickOutside("[data-table-menu]", () => (menuOpen.value = false));

const page = ref(1);
const pageSize = ref(10);
const sortField = ref(null);
const sortOrder = ref("ASC");
const search = ref("");
const searchInput = ref("");
const categoryFilter = ref("");
const priorityFilter = ref("");
const agencyFilter = ref("");

const hasActiveFilters = computed(
  () => !!(searchInput.value || categoryFilter.value || priorityFilter.value || agencyFilter.value)
);
const clearFilters = () => {
  searchInput.value = "";
  categoryFilter.value = "";
  priorityFilter.value = "";
  agencyFilter.value = "";
};

// A local pick here overrides the page-level scope just for this table
// (see the template comment on the select) — falling back to whatever the
// page passed down when the table's own dropdown is left on "All Agencies".
const effectiveAgencyCode = computed(() => agencyFilter.value || props.agencyCode);

// If the page-level scope itself changes (the Agency select above the
// charts), a leftover local override here would silently keep showing a
// now-unrelated agency's cases instead of following the page like every
// other chart does — resetting keeps this table in sync by default, same
// as before this dropdown existed, with any override being a fresh choice
// made against wherever the page currently is.
watch(() => props.agencyCode, () => (agencyFilter.value = ""));

const DEFAULT_SORT_FIELD = "createdAt";
const DEFAULT_SORT_ORDER = "DESC";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

let searchDebounceTimer = null;
watch(searchInput, (value) => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    search.value = value;
  }, 300);
});

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

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1));
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, total.value));

const formatDuration = (createdAt, updatedAt) => {
  const totalMinutes = Math.round((new Date(updatedAt) - new Date(createdAt)) / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const fetchPage = async () => {
  loading.value = true;
  try {
    error.value = null;
    const result = await reportService.getCasesTable({
      agencyCode: effectiveAgencyCode.value || undefined,
      status: STATUS,
      sort: sortField.value || undefined,
      order: sortField.value ? sortOrder.value : undefined,
      search: search.value || undefined,
      category: categoryFilter.value || undefined,
      priority: priorityFilter.value || undefined,
      startDate: props.startDate,
      endDate: props.endDate,
      page: page.value,
      limit: pageSize.value,
    });
    cases.value = result.data;
    total.value = result.total;
  } catch (err) {
    error.value = "Failed to load cases.";
  } finally {
    loading.value = false;
  }
};

// Exports every closed case matching the table's current filters — not
// just the current page — so the button's scope is exactly "what this
// table is showing you", not a separate, unexplained bulk-export action.
const handleExport = async () => {
  if (exporting.value) return;
  exporting.value = true;
  exportError.value = "";
  try {
    const blob = await reportService.downloadCasesExcel(effectiveAgencyCode.value, STATUS, {
      startDate: props.startDate,
      endDate: props.endDate,
      search: search.value,
      category: categoryFilter.value,
      priority: priorityFilter.value,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTimestampedFilename("case-history", "xlsx");
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    exportError.value = "Couldn't generate the export. Please try again.";
  } finally {
    exporting.value = false;
  }
};

watch(
  [effectiveAgencyCode, () => props.startDate, () => props.endDate, sortField, sortOrder, pageSize, search, categoryFilter, priorityFilter],
  () => {
    page.value = 1;
    fetchPage();
  }
);
watch(page, fetchPage);

onMounted(fetchPage);
</script>
