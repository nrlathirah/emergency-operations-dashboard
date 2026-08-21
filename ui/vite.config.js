import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // exceljs (~930kB) is the one remaining chunk over the default 500kB
    // warning — it's dynamically imported only inside the "Export to
    // Excel" code path (see utils/chartExport.js), so it never loads on
    // any page's initial visit, only the moment someone actually exports.
    // The warning at the default threshold was a false positive for a
    // chunk that's already correctly split off; raised just past its
    // actual size so a *genuine* new oversized chunk still gets flagged.
    chunkSizeWarningLimit: 950,
  },
})
