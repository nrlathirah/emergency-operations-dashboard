<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Reports</h2>

    <div class="flex items-center gap-3 mb-4">
      <select v-model="agencyFilter" class="border rounded px-3 py-1.5 text-sm">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>

      <a
        :href="exportUrl"
        target="_blank"
        class="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      >Export to Excel</a>
    </div>

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
