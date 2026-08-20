<template>
  <div>
    <div class="rb-topbar">
      <div class="rb-brand">
        <span class="rb-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.3" /></svg>
        </span>
        <div>
          <span class="rb-eyebrow">Emergency Operations</span>
          <h1>Live Operations</h1>
        </div>
      </div>
    </div>

    <div class="rb-section grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
      <VehicleMap
        class="min-w-0"
        :agency-filter="agencyFilter"
        :status-filter="statusFilter"
        :focus-case-id="mapFocusCaseId"
        @focus-case="handleFocusCase"
        @panel-height="(h) => (mapPanelHeight = h)"
      />
      <CaseList
        class="min-w-0"
        v-model:agency-filter="agencyFilter"
        v-model:status-filter="statusFilter"
        :focused-case-id="focusedCaseId"
        :match-height="mapPanelHeight"
        @show-on-map="handleShowOnMap"
      />
    </div>
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
// The map's real rendered height (it varies — the legend row can wrap
// depending on how many agencies are visible), fed to CaseList so its
// panel can match exactly instead of guessing at a fixed number.
const mapPanelHeight = ref(null);

// Append a timestamp so clicking the same marker/row twice in a row still
// produces a new value — Vue's watch only fires on an actual change.
const handleFocusCase = (caseId) => {
  focusedCaseId.value = `${caseId}:${Date.now()}`;
};

const handleShowOnMap = (caseId) => {
  mapFocusCaseId.value = `${caseId}:${Date.now()}`;
};
</script>
