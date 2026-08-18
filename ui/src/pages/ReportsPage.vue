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
        <select v-if="isSuperAdmin" v-model="agencyFilter" class="rb-scope-select">
          <option value="">All Agencies</option>
          <option value="KKM">KKM</option>
          <option value="PDRM">PDRM</option>
          <option value="JBPM">JBPM</option>
        </select>
      </div>
    </div>

    <p class="rb-scope-note">
      <span class="rb-legend">
        <span><span class="rb-legend-dot" style="background: var(--kkm)"></span>KKM</span>
        <span><span class="rb-legend-dot" style="background: var(--pdrm)"></span>PDRM</span>
        <span><span class="rb-legend-dot" style="background: var(--jbpm)"></span>JBPM</span>
      </span>
      · <span class="rb-live-dot"></span> live data
    </p>

    <ResponseTimeCard :agency-code="agencyFilter" />

    <div class="rb-section">
      <CasesTrendChart :agency-code="agencyFilter" />
    </div>

    <div class="rb-chart-grid">
      <component
        :is="section.component"
        v-for="(section, index) in chartSections"
        :key="section.key"
        :agency-code="agencyFilter"
        :class="{ 'rb-span-2': index === chartSections.length - 1 && chartSections.length % 2 !== 0 }"
      />
    </div>

    <div class="rb-section">
      <CasesDataTable :agency-code="agencyFilter" :is-super-admin="isSuperAdmin" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import CasesChart from "../components/CasesChart.vue";
import CasesByAgencyChart from "../components/CasesByAgencyChart.vue";
import CasesByPriorityChart from "../components/CasesByPriorityChart.vue";
import CasesByCategoryChart from "../components/CasesByCategoryChart.vue";
import CasesByHourChart from "../components/CasesByHourChart.vue";
import PriorityByAgencyChart from "../components/PriorityByAgencyChart.vue";
import CasesTrendChart from "../components/CasesTrendChart.vue";
import ResponseTimeCard from "../components/ResponseTimeCard.vue";
import VehicleUtilizationChart from "../components/VehicleUtilizationChart.vue";
import CasesDataTable from "../components/CasesDataTable.vue";
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
</script>
