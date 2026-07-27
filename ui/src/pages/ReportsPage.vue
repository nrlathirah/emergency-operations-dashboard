<template>
  <div>
    <h2>Reports</h2>

    <select v-model="agencyFilter">
      <option value="">All Agencies</option>
      <option value="KKM">KKM</option>
      <option value="PDRM">PDRM</option>
      <option value="JBPM">JBPM</option>
    </select>

    <a :href="exportUrl" target="_blank">Export to Excel</a>

    <CasesChart :agency-code="agencyFilter" />
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import CasesChart from "../components/CasesChart.vue";
import { reportService } from "../services/reportService";

const agencyFilter = ref("");
const exportUrl = computed(() => reportService.getExportUrl(agencyFilter.value));
</script>
