<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Reports</h2>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <select v-if="isSuperAdmin" v-model="agencyFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>

      <button
        type="button"
        :disabled="exporting"
        @click="handleExport"
        class="px-3 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer transition disabled:opacity-60 disabled:cursor-default"
      >{{ exporting ? "Generating…" : "Export to Excel" }}</button>
      <p v-if="exportError" class="text-red-600 text-xs">{{ exportError }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h3 class="text-sm font-medium text-gray-600 mb-2">Cases by Status</h3>
        <CasesChart :agency-code="agencyFilter" />
      </div>
      <div v-if="isSuperAdmin">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Cases by Agency</h3>
        <CasesByAgencyChart :agency-code="agencyFilter" />
      </div>
      <div>
        <h3 class="text-sm font-medium text-gray-600 mb-2">Vehicle Utilization</h3>
        <VehicleUtilizationChart :agency-code="agencyFilter" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import CasesChart from "../components/CasesChart.vue";
import CasesByAgencyChart from "../components/CasesByAgencyChart.vue";
import VehicleUtilizationChart from "../components/VehicleUtilizationChart.vue";
import { reportService } from "../services/reportService";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

const agencyFilter = ref("");
const exporting = ref(false);
const exportError = ref("");

const handleExport = async () => {
  if (exporting.value) return;
  exporting.value = true;
  exportError.value = "";
  try {
    const blob = await reportService.downloadCasesExcel(agencyFilter.value);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cases-report.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    exportError.value = "Couldn't generate the export. Please try again.";
  } finally {
    exporting.value = false;
  }
};
</script>
