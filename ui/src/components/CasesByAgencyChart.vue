<template>
  <ChartFrame
    title="Cases by Agency"
    :rows="rows"
    :loading="!rows && !error"
    :error="error"
    :agency-code="agencyCode"
    :date-range-label="dateRangeLabel"
    filename="cases-by-agency"
    label-header="Agency"
    @retry="loadChart"
  >
    <WaffleChart :segments="rows" />
  </ChartFrame>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import WaffleChart from "./WaffleChart.vue";
import ChartFrame from "./ChartFrame.vue";

const props = defineProps({
  agencyCode: { type: String, default: "" },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  dateRangeLabel: { type: String, default: null },
});

const AGENCY_COLORS = { KKM: "var(--kkm)", PDRM: "var(--pdrm)", JBPM: "var(--jbpm)" };

const rows = ref(null);
const error = ref("");

const loadChart = async () => {
  try {
    error.value = "";
    const summary = await reportService.getCasesByAgency(props.agencyCode || undefined, {
      startDate: props.startDate,
      endDate: props.endDate,
    });
    rows.value = Object.keys(summary)
      .sort((a, b) => summary[b] - summary[a])
      .map((label) => ({ label, value: summary[label], color: AGENCY_COLORS[label] || "var(--accent)" }));
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

watch([() => props.agencyCode, () => props.startDate, () => props.endDate], loadChart);
onMounted(loadChart);
</script>
