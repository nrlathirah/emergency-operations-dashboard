<template>
  <div class="space-y-6">
    <VehicleMap
      :agency-filter="agencyFilter"
      :status-filter="statusFilter"
      :focus-case-id="mapFocusCaseId"
      @focus-case="handleFocusCase"
    />
    <CaseList
      v-model:agency-filter="agencyFilter"
      v-model:status-filter="statusFilter"
      :focused-case-id="focusedCaseId"
      @show-on-map="handleShowOnMap"
    />
  </div>
</template>

<script setup>
import { ref } from "vue";
import VehicleMap from "../components/VehicleMap.vue";
import CaseList from "../components/CaseList.vue";

const agencyFilter = ref("");
const statusFilter = ref("");
const focusedCaseId = ref(null);
const mapFocusCaseId = ref(null);

// Append a timestamp so clicking the same marker/row twice in a row still
// produces a new value — Vue's watch only fires on an actual change.
const handleFocusCase = (caseId) => {
  focusedCaseId.value = `${caseId}:${Date.now()}`;
};

const handleShowOnMap = (caseId) => {
  mapFocusCaseId.value = `${caseId}:${Date.now()}`;
};
</script>
