<template>
  <ChartFrame
    title="Cases by Category"
    :rows="allRows"
    :loading="!rows && !error"
    :error="error"
    :agency-code="agencyCode"
    :date-range-label="dateRangeLabel"
    filename="cases-by-category"
    label-header="Category"
    @retry="loadChart"
  >
    <BubbleChart :rows="rows" :caption="caption" />
  </ChartFrame>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { reportService } from "../services/reportService";
import { useThemeStore } from "../stores/theme";
import BubbleChart from "./BubbleChart.vue";
import ChartFrame from "./ChartFrame.vue";

const themeStore = useThemeStore();

const props = defineProps({
  agencyCode: { type: String, default: "" },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  dateRangeLabel: { type: String, default: null },
});

// With "All Agencies" selected, categories combine across all 3 agencies —
// too many bars to stay readable, and lumping the remainder into a single
// grey "Other" bar would (with this data's long tail) dwarf every real
// category. A plain-text caption for what's left avoids both problems.
// The toolbar's data-view/export actions still work against the full set
// (allRows) — only the visual bar chart itself stays capped.
const TOP_N = 8;

// Categories have no fixed semantic color (unlike status/priority/agency),
// so each bar is assigned one from a rotating palette instead of all
// rendering in the same default accent color. Ordered light -> dark to
// match the bars' descending-count order, so the chart reads as one
// deliberate progression rather than light/dark colors mixed at random.
// Kept out of near-black territory too — pushed dark enough, different
// hues (dark green, dark maroon, dark purple) start to look the same
// regardless of hue, so the darkest entry here still reads clearly as
// its own color. Every value is checked (OKLab ΔE) to stay clearly
// distinct both from the 3 reserved agency colors and from each other.
// Dark-mode variant is a *separate* validated palette, not the light one
// displayed on a dark surface — re-run through the same dataviz checker
// against the dark chart surface. An 8-way CVD-safe set proved unreachable
// within the dark lightness band after extensive iteration (a known hard
// problem for high slot counts); 6 is what actually passes, so a 7th/8th
// category cycles back through it via the existing modulo below — every
// bubble also carries its own text label, so a rare color repeat among the
// smallest two categories is still fully distinguishable.
const PALETTE_LIGHT = ["#F498B4", "#3EB99D", "#8286D4", "#8D7E18", "#974F81", "#007260", "#764600", "#5B3275"];
const PALETTE_DARK = ["#DD5F66", "#A88418", "#22A884", "#2B93CE", "#9358D6", "#A83A72"];
const palette = () => (themeStore.resolved === "dark" ? PALETTE_DARK : PALETTE_LIGHT);

const rows = ref(null);
const caption = ref("");
const error = ref("");
const allRows = ref(null);

const loadChart = async () => {
  try {
    error.value = "";
    const summary = await reportService.getCasesByCategory(props.agencyCode || undefined, {
      startDate: props.startDate,
      endDate: props.endDate,
    });
    const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);
    const colors = palette();
    const top = sorted.slice(0, TOP_N).map(([key, value], i) => ({ label: capitalize(key), value, color: colors[i % colors.length] }));
    const rest = sorted.slice(TOP_N);
    const restTotal = rest.reduce((sum, [, count]) => sum + count, 0);

    rows.value = top;
    allRows.value = sorted.map(([key, value], i) => ({ label: capitalize(key), value, color: colors[i % colors.length] }));
    caption.value = rest.length > 0 ? `+ ${rest.length} more categor${rest.length === 1 ? "y" : "ies"} · ${restTotal} case${restTotal === 1 ? "" : "s"} not shown` : "";
  } catch (err) {
    error.value = "Failed to load chart data.";
  }
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

// Only the mapped colors need to change when the theme flips — re-fetching
// from the API just to recolor already-loaded bubbles would be wasteful and
// flash a loading state for no reason.
const recolor = () => {
  const colors = palette();
  if (rows.value) rows.value = rows.value.map((row, i) => ({ ...row, color: colors[i % colors.length] }));
  if (allRows.value) allRows.value = allRows.value.map((row, i) => ({ ...row, color: colors[i % colors.length] }));
};

watch([() => props.agencyCode, () => props.startDate, () => props.endDate], loadChart);
watch(() => themeStore.resolved, recolor);
onMounted(loadChart);
</script>
