<template>
  <div class="rb-cal-range" data-cal-range>
    <button type="button" class="rb-cal-trigger" @click="open = !open">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
      <span>{{ rangeLabel }}</span>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 8l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>

    <div v-if="open" class="rb-cal-popover">
      <div class="rb-cal-presets">
        <button
          v-for="preset in PRESETS"
          :key="preset.label"
          type="button"
          class="rb-daterange-preset"
          :class="{ 'rb-daterange-preset--active': activePreset === preset.label }"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>

      <div class="rb-cal-header">
        <button type="button" class="rb-icon-btn" aria-label="Previous month" @click="prevMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span class="rb-cal-month-label">{{ monthLabel }}</span>
        <button type="button" class="rb-icon-btn" aria-label="Next month" @click="nextMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      <div class="rb-cal-weekdays">
        <span v-for="d in WEEKDAY_LABELS" :key="d">{{ d }}</span>
      </div>
      <div class="rb-cal-grid" @mouseleave="hoverDate = null">
        <span
          v-for="(cell, i) in calendarCells"
          :key="i"
          class="rb-cal-day"
          :class="dayClasses(cell)"
          @click="cell.inMonth && !cell.future && selectDay(cell.dateStr)"
          @mouseenter="cell.inMonth && (hoverDate = cell.dateStr)"
        >{{ cell.day }}</span>
      </div>

      <p class="rb-cal-hint">{{ startDate && !endDate ? "Pick an end date…" : "Click a date to start a new range" }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const startDate = defineModel("startDate", { type: String, default: null });
const endDate = defineModel("endDate", { type: String, default: null });

const DAY_MS = 24 * 60 * 60 * 1000;
// toISOString() converts to UTC first — for any timezone ahead of UTC
// (Malaysia is UTC+8), that silently rolls local midnight back to the
// previous day. Building the string from local getters avoids that.
const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const todayStr = toDateStr(new Date());

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All time", days: null },
];

const rangeForDays = (days) => {
  const end = new Date();
  const start = new Date(Date.now() - (days - 1) * DAY_MS);
  return { start: toDateStr(start), end: toDateStr(end) };
};

const open = ref(false);
const hoverDate = ref(null);

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const viewMonth = ref(startOfMonth(new Date()));

const monthLabel = computed(() => viewMonth.value.toLocaleDateString("en-MY", { month: "long", year: "numeric" }));
const prevMonth = () => {
  viewMonth.value = new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth() - 1, 1);
};
const nextMonth = () => {
  viewMonth.value = new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth() + 1, 1);
};

// Jumping back into the picker always shows something relevant — the end
// date's month if a range is set, otherwise today's — rather than wherever
// month navigation happened to leave off last time.
const jumpToRelevantMonth = () => {
  const anchor = endDate.value || startDate.value;
  viewMonth.value = startOfMonth(anchor ? new Date(`${anchor}T00:00:00`) : new Date());
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const calendarCells = computed(() => {
  const first = viewMonth.value;
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ dateStr: null, day: "", inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(new Date(first.getFullYear(), first.getMonth(), d));
    cells.push({ dateStr, day: d, inMonth: true, future: dateStr > todayStr });
  }
  return cells;
});

// While only the start is picked, hovering previews the range the way a
// second click would complete it — same idea as tmbi's single-calendar
// range picker, just built from scratch (no access to its source to copy).
const inRange = (dateStr) => {
  if (!dateStr || !startDate.value) return false;
  const effectiveEnd = endDate.value || hoverDate.value;
  if (!effectiveEnd) return false;
  const [lo, hi] = startDate.value <= effectiveEnd ? [startDate.value, effectiveEnd] : [effectiveEnd, startDate.value];
  return dateStr >= lo && dateStr <= hi;
};

const dayClasses = (cell) => {
  if (!cell.inMonth) return { "rb-cal-day--blank": true };
  return {
    "rb-cal-day--future": cell.future,
    "rb-cal-day--today": cell.dateStr === todayStr,
    "rb-cal-day--in-range": inRange(cell.dateStr),
    "rb-cal-day--start": cell.dateStr === startDate.value,
    "rb-cal-day--end": cell.dateStr === endDate.value,
  };
};

const selectDay = (dateStr) => {
  if (!startDate.value || endDate.value) {
    // Nothing picked yet, or a complete range already exists — either way
    // this click starts a fresh selection.
    startDate.value = dateStr;
    endDate.value = null;
    return;
  }
  // Completing the range — a click before the start swaps the two instead
  // of producing an inverted (end-before-start) range.
  if (dateStr < startDate.value) {
    endDate.value = startDate.value;
    startDate.value = dateStr;
  } else {
    endDate.value = dateStr;
  }
  open.value = false;
};

const applyPreset = (preset) => {
  if (preset.days === null) {
    startDate.value = null;
    endDate.value = null;
  } else {
    const { start, end } = rangeForDays(preset.days);
    startDate.value = start;
    endDate.value = end;
  }
  open.value = false;
};

// Highlights a preset only when the current range exactly matches what
// clicking it would produce — picking dates by hand just leaves no preset
// highlighted, rather than snapping to a false match.
const activePreset = computed(() => {
  if (!startDate.value && !endDate.value) return "All time";
  const match = PRESETS.find((preset) => {
    if (preset.days === null) return false;
    const { start, end } = rangeForDays(preset.days);
    return startDate.value === start && endDate.value === end;
  });
  return match?.label ?? null;
});

// Inclusive day count computed from the date-key strings directly (via
// Date.UTC, not local Date parsing) so it can't be thrown off by the same
// kind of timezone drift toDateStr above was fixed for.
const dayCount = computed(() => {
  if (!startDate.value || !endDate.value) return null;
  const [sy, sm, sd] = startDate.value.split("-").map(Number);
  const [ey, em, ed] = endDate.value.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / DAY_MS) + 1;
});

const rangeLabel = computed(() => {
  if (!startDate.value || !endDate.value) return "All time";
  const fmt = (s) => new Date(`${s}T00:00:00`).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  const count = dayCount.value;
  const dayWord = count === 1 ? "day" : "days";
  if (startDate.value === endDate.value) return `${fmt(startDate.value)} (${count} ${dayWord})`;
  return `${fmt(startDate.value)} – ${fmt(endDate.value)} (${count} ${dayWord})`;
});

const handleOutsideClick = (e) => {
  if (!e.target.closest("[data-cal-range]")) open.value = false;
};
onMounted(() => window.addEventListener("click", handleOutsideClick));
onUnmounted(() => window.removeEventListener("click", handleOutsideClick));

// Re-anchor the visible month every time the popover opens, so it always
// shows something relevant instead of wherever month navigation last left off.
watch(open, (isOpen) => {
  if (isOpen) jumpToRelevantMonth();
});
</script>
