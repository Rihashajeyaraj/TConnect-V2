import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    // Raise warning threshold — we use lazy chunks so individual route files can be larger
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // ── Core React runtime (needed on every route) ──────────────────
          // Include react-router-dom + its @remix-run/* transitive deps
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/@remix-run/')
          ) {
            return 'vendor-react'
          }

          // ── Supabase (needed on every authenticated route) ─────────────
          // Match @supabase/* namespace and any realtime/postgrest sub-packages
          if (id.includes('/@supabase/') || id.includes('/supabase/')) {
            return 'vendor-supabase'
          }

          // ── Icon library — tree-shaken via named imports ────────────────
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons'
          }

          // ── Chart / data-viz (heavy, only on dashboard/report routes) ───
          // These are lazy-loaded route chunks, so vendor-charts is only
          // downloaded when the user visits a dashboard/report page.
          if (
            id.includes('/recharts/') ||
            id.includes('/d3-') ||
            id.includes('/d3/') ||
            id.includes('/victory-vendor/')
          ) {
            return 'vendor-charts'
          }

          // ── Everything else from node_modules ──────────────────────────
          return 'vendor-other'
        },
      },
    },
  },
})
