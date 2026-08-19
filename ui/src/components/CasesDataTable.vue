<template>
  <div class="rb-panel">
    <div class="rb-panel-head">
      <div>
        <span class="rb-panel-tag">Manifest</span>
        <h2>Case History</h2>
        <p class="rb-panel-meta">Closed cases only — see the Live Dashboard for cases still in progress.</p>
      </div>
      <div class="relative" data-table-menu>
        <button type="button" @click="menuOpen = !menuOpen" class="rb-icon-btn" title="More options" aria-label="More options">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
        <div v-if="menuOpen" class="rb-chart-menu">
          <button type="button" :disabled="exporting" @click="handleExport">{{ exporting ? "Generating…" : "Export to Excel" }}</button>
          <button type="button" @click="handlePrint">Print</button>
        </div>
      </div>
    </div>
    <p v-if="exportError" class="text-red-600 text-xs mb-3">{{ exportError }}</p>

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
            <td :colspan="isSuperAdmin ? 7 : 6" class="rb-empty">No closed cases found.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="c in cases" :key="c.id">
            <td class="rb-case-id">{{ c.caseNumber }}</td>
            <td v-if="isSuperAdmin"><span class="rb-chip-agency" :data-agency="c.Agency?.code">{{ c.Agency?.code || "—" }}</span></td>
            <td class="capitalize">{{ c.category }}</td>
            <td><span class="rb-priority-tag" :data-priority="c.priority"><span class="rb-dot"></span>{{ capitalize(c.priority) }}</span></td>
            <td class="rb-case-loc">{{ c.location }}</td>
            <td class="rb-created-time tabular">{{ formatDate(c.createdAt) }}</td>
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
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { reportService } from "../services/reportService";
import { buildTimestampedFilename } from "../utils/chartExport";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  isSuperAdmin: { type: Boolean, default: false },
});

// "Case History" — closed/resolved cases only. Cases still in progress
// belong on the Live Dashboard, not here, so there's no status filter to
// pick from: this table's whole point is the closed subset.
const STATUS = "closed";

const cases = ref([]);
const total = ref(0);
const loading = ref(true);
const error = ref(null);
const exporting = ref(false);
const exportError = ref("");
const menuOpen = ref(false);

const page = ref(1);
const pageSize = ref(10);
const sortField = ref(null);
const sortOrder = ref("ASC");

const DEFAULT_SORT_FIELD = "createdAt";
const DEFAULT_SORT_ORDER = "DESC";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

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

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

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
      agencyCode: props.agencyCode || undefined,
      status: STATUS,
      sort: sortField.value || undefined,
      order: sortField.value ? sortOrder.value : undefined,
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

// Exports every closed case matching the table's current agency filter —
// not just the current page — so the button's scope is exactly "what this
// table is showing you", not a separate, unexplained bulk-export action.
const handleExport = async () => {
  if (exporting.value) return;
  menuOpen.value = false;
  exporting.value = true;
  exportError.value = "";
  try {
    const blob = await reportService.downloadCasesExcel(props.agencyCode, STATUS);
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

// Prints whatever page of the table is currently loaded, not the full
// filtered set — a quick printout of what's on screen, distinct from the
// full bulk Excel export above.
const handlePrint = () => {
  menuOpen.value = false;
  const rowsHtml = cases.value
    .map(
      (c) => `<tr>
        <td>${c.caseNumber}</td>
        ${props.isSuperAdmin ? `<td>${c.Agency?.code || "—"}</td>` : ""}
        <td>${capitalize(c.category)}</td>
        <td>${capitalize(c.priority)}</td>
        <td>${c.location}</td>
        <td>${formatDate(c.createdAt)}</td>
        <td>${formatDuration(c.createdAt, c.updatedAt)}</td>
      </tr>`
    )
    .join("");
  const agencyHeader = props.isSuperAdmin ? "<th>Agency</th>" : "";
  const win = window.open("", "_blank", "width=800,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Case History</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 28px; color: #101A1C; }
      h1 { font-size: 17px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #D8E3E0; padding: 7px 12px; text-align: left; font-size: 12px; }
      th { background: #E7EFED; }
    </style>
  </head><body>
    <h1>Case History — Closed Cases</h1>
    <table><thead><tr><th>Case ID</th>${agencyHeader}<th>Category</th><th>Priority</th><th>Location</th><th>Created</th><th>Resolved In</th></tr></thead>
    <tbody>${rowsHtml}</tbody></table>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
};

const handleOutsideClick = (e) => {
  if (!e.target.closest("[data-table-menu]")) menuOpen.value = false;
};
onMounted(() => window.addEventListener("click", handleOutsideClick));
onUnmounted(() => window.removeEventListener("click", handleOutsideClick));

watch([() => props.agencyCode, sortField, sortOrder, pageSize], () => {
  page.value = 1;
  fetchPage();
});
watch(page, fetchPage);

onMounted(fetchPage);
</script>
