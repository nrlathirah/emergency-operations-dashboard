<template>
  <div class="rb-panel">
    <div class="rb-panel-head">
      <div>
        <h2>{{ title }}</h2>
      </div>
      <div v-if="!loading && !error" class="rb-chart-toolbar">
        <button
          type="button"
          @click="dataView = !dataView"
          class="rb-icon-btn"
          :class="{ 'rb-icon-btn--active': dataView }"
          :title="dataView ? 'Show chart' : 'Show data table'"
          :aria-label="dataView ? 'Show chart' : 'Show data table'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="9" y1="10" x2="9" y2="20" />
          </svg>
        </button>
        <button v-if="!dataView" type="button" @click="downloadImage" class="rb-icon-btn" title="Download image" aria-label="Download image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
        </button>
        <button type="button" @click="fullscreen = true" class="rb-icon-btn" title="Full screen" aria-label="Full screen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m11-5v3a2 2 0 01-2 2h-3" />
          </svg>
        </button>
        <div class="relative" data-chart-menu>
          <button type="button" @click="menuOpen = !menuOpen" class="rb-icon-btn" title="More options" aria-label="More options">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </button>
          <div v-if="menuOpen" class="rb-chart-menu">
            <button type="button" @click="exportExcel">Export to Excel</button>
            <button type="button" @click="printChart">Print</button>
          </div>
        </div>
      </div>
    </div>

    <ErrorBanner v-if="error" :message="error" @retry="$emit('retry')" />
    <LoadingSpinner v-else-if="loading" />
    <div v-else>
      <div v-if="dataView" class="rb-data-table-scroll">
        <table class="rb-data-table">
          <thead><tr><th>{{ labelHeader }}</th><th>Count</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.label">
              <td><span v-if="row.color" class="rb-dot" :style="{ background: row.color }"></span>{{ row.label }}</td>
              <td class="tabular">{{ row.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <slot v-else />
    </div>

    <!-- Dedicated, always-rendered export layout — kept off-screen, never
         shown to the user. downloadImage/printImage capture this instead of
         the visible in-card chart, so the exported image always has the
         title, sits in a proper landscape frame, and is available
         regardless of whether data-table view happens to be toggled on
         (the visible chart isn't even mounted then). -->
    <div v-if="!loading && !error" ref="exportRef" class="rb-chart-export" aria-hidden="true">
      <div class="rb-chart-export-brand">
        <span class="rb-chart-export-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l1.5-4L11 17l2.5-9L15 12h7" /></svg>
        </span>
        <span class="rb-chart-export-brand-name">Emergency Operations Dashboard</span>
      </div>
      <h2 class="rb-chart-export-title">{{ title }}</h2>
      <div class="rb-chart-export-divider"></div>
      <div class="rb-chart-export-body">
        <slot />
      </div>
      <div class="rb-chart-export-footer">
        <span><strong>{{ agencyLabel }}</strong> · {{ props.dateRangeLabel || "All Time" }}</span>
        <span>Generated {{ exportedAt }}</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="fullscreen" class="rb-fullscreen-overlay" @click.self="fullscreen = false">
        <div class="rb-fullscreen-panel">
          <div class="rb-fullscreen-head">
            <h3>{{ title }}</h3>
            <button type="button" class="rb-icon-btn" @click="fullscreen = false" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div class="rb-fullscreen-body">
            <table v-if="dataView" class="rb-data-table">
              <thead><tr><th>{{ labelHeader }}</th><th>Count</th></tr></thead>
              <tbody>
                <tr v-for="row in rows" :key="row.label">
                  <td><span v-if="row.color" class="rb-dot" :style="{ background: row.color }"></span>{{ row.label }}</td>
                  <td class="tabular">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
            <slot v-else />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import html2canvas from "html2canvas";
import { downloadRowsExcel, buildTimestampedFilename, splitDateRangeLabel } from "../utils/chartExport";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: null }, // [{ label, value, color? }]
  filename: { type: String, required: true },
  labelHeader: { type: String, default: "Label" },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  agencyCode: { type: String, default: "" }, // for the export footer's scope line
  // A ready-to-display string ("2026-07-21 to 2026-08-19 (30 days)") —
  // resolved once at the Reports page level (it needs the actual earliest
  // case on record to say something real instead of a vague "All Time"
  // when no explicit range is picked), not recomputed per chart.
  dateRangeLabel: { type: String, default: null },
});

defineEmits(["retry"]);

const dataView = ref(false);
const fullscreen = ref(false);
const menuOpen = ref(false);
const exportRef = ref(null);

const agencyLabel = computed(() => props.agencyCode || "All Agencies");
const exportedAt = ref("");
const formatExportedAt = () =>
  new Date().toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// html2canvas can fire before the Google Font (IBM Plex Sans) has actually
// finished loading, silently substituting a fallback with different letter
// widths — waiting for document.fonts.ready avoids capturing that transient
// state.
const captureExport = async () => {
  if (!exportRef.value) return null;
  exportedAt.value = formatExportedAt();
  await nextTick();
  await document.fonts.ready;
  try {
    return await html2canvas(exportRef.value, { backgroundColor: "#ffffff", scale: 2 });
  } catch (err) {
    // A silent failure here previously looked like nothing happened at all
    // when clicked — surface it instead of failing invisibly.
    window.alert("Couldn't generate the chart image. Please try again.");
    return null;
  }
};

const downloadImage = async () => {
  const canvas = await captureExport();
  if (!canvas) return;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = buildTimestampedFilename(props.filename, "png");
  link.click();
};

const exportExcel = () => {
  menuOpen.value = false;
  const { dateRangeLabel, durationLabel } = splitDateRangeLabel(props.dateRangeLabel);
  downloadRowsExcel(props.rows, buildTimestampedFilename(props.filename, "xlsx"), {
    title: props.title,
    agencyLabel: agencyLabel.value,
    dateRangeLabel: dateRangeLabel || "All Time",
    durationLabel,
    generatedAt: formatExportedAt(),
    labelHeader: props.labelHeader,
  });
};

// Always prints the chart's own visual, never the data-table dump — captures
// the dedicated (always-mounted) export layout, so this works regardless of
// whether data-table view happens to be toggled on right now.
const printChart = async () => {
  menuOpen.value = false;
  await printImage();
};

const printImage = async () => {
  const canvas = await captureExport();
  if (!canvas) return;
  const dataUrl = canvas.toDataURL("image/png");
  const win = window.open("", "_blank", "width=700,height=600");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${props.title}</title>
    <style>
      body { margin: 0; padding: 16px; }
      img { max-width: 100%; display: block; }
    </style>
  </head><body>
    <img src="${dataUrl}" />
  </body></html>`);
  win.document.close();
  win.focus();
  const img = win.document.querySelector("img");
  const triggerPrint = () => {
    win.print();
    win.close();
  };
  if (img.complete) triggerPrint();
  else img.onload = triggerPrint;
};

const handleOutsideClick = (e) => {
  if (!e.target.closest("[data-chart-menu]")) menuOpen.value = false;
};
onMounted(() => window.addEventListener("click", handleOutsideClick));
onUnmounted(() => window.removeEventListener("click", handleOutsideClick));
</script>
