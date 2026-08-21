<template>
  <div>
    <div class="rb-topbar">
      <div class="rb-brand">
        <span class="rb-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l1.5-4L11 17l2.5-9L15 12h7" /></svg>
        </span>
        <div>
          <span class="rb-eyebrow">Emergency Operations</span>
          <h1>Incident Reports</h1>
        </div>
      </div>
      <div class="rb-controls">
        <DateRangePicker v-model:start-date="startDate" v-model:end-date="endDate" />
        <select v-if="isSuperAdmin" v-model="agencyFilter" class="rb-scope-select">
          <option value="">All Agencies</option>
          <option value="KKM">KKM</option>
          <option value="PDRM">PDRM</option>
          <option value="JBPM">JBPM</option>
        </select>
        <button type="button" class="rb-icon-btn" title="Refresh" aria-label="Refresh" @click="refreshKey++">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 01-9 9 9 9 0 01-8.485-6M3 12a9 9 0 019-9 9 9 0 018.485 6" />
            <path d="M21 3v6h-6M3 21v-6h6" />
          </svg>
        </button>
        <button type="button" class="rb-btn-export" :disabled="exportingFullReport" @click="downloadFullReport">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          {{ exportingFullReport ? "Generating…" : "Export Full Report" }}
        </button>
      </div>
    </div>

    <p class="rb-scope-note">
      <span class="rb-legend">
        <!-- A staff account's own data is already scoped server-side to
             just their agency — listing every agency here regardless
             misrepresented that scope, showing PDRM/JBPM in the legend of
             a KKM staff account's own reports even though none of that
             data is actually present anywhere on the page. -->
        <template v-if="isSuperAdmin">
          <!-- Dimming whichever agencies the top filter has excluded (only
               once one's actually picked — plain "All Agencies" leaves
               every dot at full opacity, same as before this existed) is
               just a visible echo of what the filter above already did, so
               it's obvious at a glance which agency the whole page — every
               KPI and chart below, not just this legend — is currently
               scoped to. -->
          <span :class="{ 'rb-legend-dim': agencyFilter && agencyFilter !== 'KKM' }"><span class="rb-legend-dot" style="background: var(--kkm)"></span>KKM</span>
          <span :class="{ 'rb-legend-dim': agencyFilter && agencyFilter !== 'PDRM' }"><span class="rb-legend-dot" style="background: var(--pdrm)"></span>PDRM</span>
          <span :class="{ 'rb-legend-dim': agencyFilter && agencyFilter !== 'JBPM' }"><span class="rb-legend-dot" style="background: var(--jbpm)"></span>JBPM</span>
        </template>
        <span v-else><span class="rb-legend-dot" :style="{ background: `var(--${authStore.user?.agency?.toLowerCase()})` }"></span>{{ authStore.user?.agency }}</span>
      </span>
      · <span class="rb-live-dot"></span> live data
    </p>

    <ResponseTimeCard :key="`rtc-${refreshKey}`" :agency-code="agencyFilter" :start-date="startDate" :end-date="endDate" />

    <div class="rb-section">
      <CasesTrendChart
        :key="`trend-${refreshKey}`"
        :agency-code="agencyFilter"
        :start-date="startDate"
        :end-date="endDate"
        :date-range-label="resolvedDateRangeLabel"
      />
    </div>

    <div class="rb-section">
      <ResponseTimeTrendChart
        :key="`rt-trend-${refreshKey}`"
        :agency-code="agencyFilter"
        :start-date="startDate"
        :end-date="endDate"
        :date-range-label="resolvedDateRangeLabel"
      />
    </div>

    <div class="rb-chart-grid" :key="`grid-${refreshKey}`">
      <component
        :is="section.component"
        v-for="(section, index) in chartSections"
        :key="section.key"
        :agency-code="agencyFilter"
        :start-date="startDate"
        :end-date="endDate"
        :date-range-label="resolvedDateRangeLabel"
        :class="{ 'rb-span-2': index === chartSections.length - 1 && chartSections.length % 2 !== 0 }"
      />
    </div>

    <div class="rb-section">
      <CasesDataTable
        :key="`table-${refreshKey}`"
        :agency-code="agencyFilter"
        :is-super-admin="isSuperAdmin"
        :start-date="startDate"
        :end-date="endDate"
        :date-range-label="resolvedDateRangeLabel"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import CasesChart from "../components/CasesChart.vue";
import CasesByAgencyChart from "../components/CasesByAgencyChart.vue";
import CasesByPriorityChart from "../components/CasesByPriorityChart.vue";
import CasesByCategoryChart from "../components/CasesByCategoryChart.vue";
import CasesByHourChart from "../components/CasesByHourChart.vue";
import PriorityByAgencyChart from "../components/PriorityByAgencyChart.vue";
import CasesTrendChart from "../components/CasesTrendChart.vue";
import ResponseTimeTrendChart from "../components/ResponseTimeTrendChart.vue";
import ResponseTimeCard from "../components/ResponseTimeCard.vue";
import VehicleUtilizationChart from "../components/VehicleUtilizationChart.vue";
import CasesDataTable from "../components/CasesDataTable.vue";
import DateRangePicker from "../components/DateRangePicker.vue";
import { reportService } from "../services/reportService";
import { buildTimestampedFilename, formatDateRangeLabel } from "../utils/chartExport";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

// Order matters, for two reasons: donuts (Priority, Vehicle, Agency) are
// placed so one always lands paired with another chart, never alone in a
// spanned full-width row — a donut stretched across 2 columns looks wrong.
// And the heatmap/stacked-bar are deliberately last, since both are
// suited to being wide, so whichever ends up as the odd-one-out full-width
// item still looks intentional instead of a bar chart looking oddly wide.
const chartSections = computed(() => {
  const sections = [
    { key: "status", component: CasesChart },
    { key: "priority", component: CasesByPriorityChart },
    { key: "vehicle", component: VehicleUtilizationChart },
  ];
  if (isSuperAdmin.value) {
    sections.push({ key: "agency", component: CasesByAgencyChart });
  }
  sections.push({ key: "category", component: CasesByCategoryChart });
  sections.push({ key: "hour", component: CasesByHourChart });
  if (isSuperAdmin.value) {
    sections.push({ key: "priorityByAgency", component: PriorityByAgencyChart });
  }
  return sections;
});

const agencyFilter = ref("");
const startDate = ref(null);
const endDate = ref(null);

// Local-safe date key (not toISOString, which rolls local midnight back a
// day for any UTC+ timezone like Malaysia's).
const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// The real start of "All time" — every export/print states an actual date
// range with a day count, never a vague "All Time" placeholder, so this is
// fetched once and reused everywhere a resolved label is needed.
const earliestDate = ref(null);
const loadDateBounds = async () => {
  try {
    const bounds = await reportService.getDateBounds(agencyFilter.value || undefined);
    earliestDate.value = bounds.earliestDate;
  } catch (err) {
    earliestDate.value = null;
  }
};
watch(agencyFilter, loadDateBounds);
onMounted(loadDateBounds);

const resolvedDateRangeLabel = computed(() => {
  if (startDate.value && endDate.value) return formatDateRangeLabel(startDate.value, endDate.value);
  const start = earliestDate.value ? toDateStr(new Date(earliestDate.value)) : toDateStr(new Date());
  return formatDateRangeLabel(start, toDateStr(new Date()));
});

// Bumping this remounts every date-scoped section below (each :key is
// derived from it) — the simplest reliable "refresh" that's guaranteed to
// re-run every component's own onMounted fetch, without adding a separate
// manual refetch trigger to each one individually.
const refreshKey = ref(0);

const exportingFullReport = ref(false);
const downloadFullReport = async () => {
  if (exportingFullReport.value) return;
  exportingFullReport.value = true;
  try {
    const blob = await reportService.downloadFullReportExcel(agencyFilter.value || undefined, {
      startDate: startDate.value,
      endDate: endDate.value,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTimestampedFilename("full-report", "xlsx");
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    window.alert("Couldn't generate the full report. Please try again.");
  } finally {
    exportingFullReport.value = false;
  }
};
</script>
