import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'Frontend/public',
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/@remix-run/')
          ) {
            return 'vendor-react'
          }
          if (id.includes('/@supabase/') || id.includes('/supabase/')) {
            return 'vendor-supabase'
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons'
          }
          if (
            id.includes('/recharts/') ||
            id.includes('/d3-') ||
            id.includes('/d3/') ||
            id.includes('/victory-vendor/')
          ) {
            return 'vendor-charts'
          }
          return 'vendor-other'
        },
      },
    },
  },
})
