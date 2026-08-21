import { defineStore } from "pinia";

const STORAGE_KEY = "theme";
const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

// "system" means "no explicit choice saved" — the theme then just tracks
// the OS preference live (see the media-query listener in App.vue). Once
// the user picks light/dark directly, that choice is remembered and wins
// over the OS setting until they explicitly go back to "system".
const readStored = () => localStorage.getItem(STORAGE_KEY) || "system";

const applyToDocument = (mode) => {
  const resolved = mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
  document.documentElement.dataset.theme = resolved;
};

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: readStored(), // "light" | "dark" | "system"
  }),
  getters: {
    resolved: (state) => (state.mode === "system" ? (prefersDark() ? "dark" : "light") : state.mode),
  },
  actions: {
    setMode(mode) {
      this.mode = mode;
      if (mode === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, mode);
      applyToDocument(mode);
    },
    toggle() {
      this.setMode(this.resolved === "dark" ? "light" : "dark");
    },
    // Applies the current mode to <html> — called once on app start, and
    // again by App.vue's OS-preference listener whenever the mode is
    // "system" so a live OS theme change is reflected without a reload.
    apply() {
      applyToDocument(this.mode);
    },
  },
});
