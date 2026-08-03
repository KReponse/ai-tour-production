// vite.config.js
// ✅ COMPLETE FIXED - Disabled source maps and auto-opening browser to prevent debugger issues

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // ✅ Disabled auto-open to prevent DevTools from opening automatically
    // open: true,  // ← REMOVED or set to false
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // ✅ Disable source maps to prevent debugger issues
    sourcemap: false,
  },
})