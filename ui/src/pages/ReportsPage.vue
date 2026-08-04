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

      <a
        :href="exportUrl"
        target="_blank"
        class="px-3 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
      >Export to Excel</a>
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
const exportUrl = computed(() => reportService.getExportUrl(agencyFilter.value));
</script>
