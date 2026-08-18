<template>
  <div class="rb-panel">
    <div class="rb-panel-head">
      <div>
        <span v-if="tag" class="rb-panel-tag">{{ tag }}</span>
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
    <div v-else ref="captureRef">
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
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import html2canvas from "html2canvas";
import { downloadRowsCsv } from "../utils/chartExport";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";

const props = defineProps({
  tag: { type: String, default: "" },
  title: { type: String, required: true },
  rows: { type: Array, default: null }, // [{ label, value, color? }]
  filename: { type: String, required: true },
  labelHeader: { type: String, default: "Label" },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
});

defineEmits(["retry"]);

const dataView = ref(false);
const fullscreen = ref(false);
const menuOpen = ref(false);
const captureRef = ref(null);

const downloadImage = async () => {
  if (!captureRef.value) return;
  const canvas = await html2canvas(captureRef.value, { backgroundColor: "#ffffff", scale: 2 });
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${props.filename}.png`;
  link.click();
};

const exportExcel = () => {
  menuOpen.value = false;
  downloadRowsCsv(props.rows, props.filename);
};

// Always prints the chart's own visual, never the data-table dump — even
// if data-table view happens to be toggled on right now, in which case the
// chart isn't even mounted (v-if/v-else swaps them, not v-show). Flips to
// chart view just long enough to capture it, then restores whatever view
// the user actually had open.
const printChart = async () => {
  menuOpen.value = false;
  const wasDataView = dataView.value;
  if (wasDataView) {
    dataView.value = false;
    await nextTick();
  }
  await printImage();
  if (wasDataView) {
    dataView.value = true;
  }
};

const printImage = async () => {
  if (!captureRef.value) return;
  const canvas = await html2canvas(captureRef.value, { backgroundColor: "#ffffff", scale: 2 });
  const dataUrl = canvas.toDataURL("image/png");
  const win = window.open("", "_blank", "width=700,height=600");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${props.title}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #101A1C; }
      h1 { font-size: 17px; margin: 0 0 16px; }
      img { max-width: 100%; }
    </style>
  </head><body>
    <h1>${props.title}</h1>
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
