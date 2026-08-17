<template>
  <div>
    <div class="flex flex-wrap gap-3 mb-3">
      <select v-model="statusFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="dispatched">Dispatched</option>
        <option value="en_route">En Route</option>
        <option value="on_scene">On Scene</option>
        <option value="closed">Closed</option>
      </select>
      <button
        v-if="statusFilter"
        type="button"
        @click="statusFilter = ''"
        class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-600 cursor-pointer transition"
      >✕ Reset Filters</button>
    </div>

    <ErrorBanner v-if="error" :message="error" @retry="fetchPage" />
    <LoadingSpinner v-else-if="loading" />
    <div v-else class="overflow-x-auto">
      <table class="min-w-[700px] text-sm border-collapse">
        <thead>
          <tr class="border-b border-gray-200 text-left text-gray-500">
            <th class="py-2 px-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('caseNumber')">Case ID {{ sortIndicator("caseNumber") }}</th>
            <th v-if="isSuperAdmin" class="py-2 px-4 whitespace-nowrap">Agency</th>
            <th class="py-2 px-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('category')">Category {{ sortIndicator("category") }}</th>
            <th class="py-2 px-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('priority')">Priority {{ sortIndicator("priority") }}</th>
            <th class="py-2 px-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('status')">Status {{ sortIndicator("status") }}</th>
            <th class="py-2 px-4 whitespace-nowrap">Location</th>
            <th class="py-2 px-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('createdAt')">Created {{ sortIndicator("createdAt") }}</th>
            <th class="py-2 px-4 whitespace-nowrap">Resolved In</th>
          </tr>
        </thead>
        <tbody v-if="cases.length === 0">
          <tr>
            <td :colspan="isSuperAdmin ? 8 : 7" class="py-10 text-center text-gray-400 text-sm">No cases found matching your filters.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="c in cases" :key="c.id" class="border-t border-gray-100 hover:bg-gray-50">
            <td class="py-2 px-4 font-medium whitespace-nowrap">{{ c.caseNumber }}</td>
            <td v-if="isSuperAdmin" class="py-2 px-4 whitespace-nowrap">{{ c.Agency?.code || "—" }}</td>
            <td class="py-2 px-4 whitespace-nowrap capitalize">{{ c.category }}</td>
            <td class="py-2 px-4 whitespace-nowrap">
              <span class="font-medium capitalize" :class="PRIORITY_TEXT_COLORS[c.priority]">{{ c.priority }}</span>
            </td>
            <td class="py-2 px-4 whitespace-nowrap capitalize">{{ c.status.replace("_", " ") }}</td>
            <td class="py-2 px-4 text-gray-600">{{ c.location }}</td>
            <td class="py-2 px-4 text-gray-600 whitespace-nowrap">{{ formatDate(c.createdAt) }}</td>
            <td class="py-2 px-4 text-gray-600 whitespace-nowrap">{{ c.status === "closed" ? formatDuration(c.createdAt, c.updatedAt) : "—" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading" class="flex items-center gap-3 mt-4 text-sm flex-wrap">
      <span class="text-gray-500 text-xs">Showing {{ rangeStart }}–{{ rangeEnd }} of {{ total }} cases</span>
      <label class="flex items-center gap-1.5 text-xs text-gray-500">
        Per page
        <select v-model.number="pageSize" class="border rounded px-2 py-1 text-xs cursor-pointer hover:bg-gray-50 transition">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </label>
      <div class="flex items-center gap-3 sm:ml-auto">
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  isSuperAdmin: { type: Boolean, default: false },
});

const PRIORITY_TEXT_COLORS = { low: "text-green-600", medium: "text-amber-600", high: "text-red-600" };

const cases = ref([]);
const total = ref(0);
const loading = ref(true);
const error = ref(null);

const statusFilter = ref("");
const page = ref(1);
const pageSize = ref(10);
const sortField = ref(null);
const sortOrder = ref("ASC");

const DEFAULT_SORT_FIELD = "createdAt";
const DEFAULT_SORT_ORDER = "DESC";

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
      status: statusFilter.value || undefined,
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

watch([() => props.agencyCode, statusFilter, sortField, sortOrder, pageSize], () => {
  page.value = 1;
  fetchPage();
});
watch(page, fetchPage);

onMounted(fetchPage);
</script>
