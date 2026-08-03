<template>
  <div class="space-y-6">
    <VehicleMap :agency-filter="agencyFilter" :status-filter="statusFilter" />
    <CaseList v-model:agency-filter="agencyFilter" v-model:status-filter="statusFilter" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import VehicleMap from "../components/VehicleMap.vue";
import CaseList from "../components/CaseList.vue";

const agencyFilter = ref("");
const statusFilter = ref("");
</script>
