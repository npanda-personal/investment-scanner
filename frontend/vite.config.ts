/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // Demo build (GitHub Pages) is served from a repo subpath; normal dev/prod stays at root.
  // VITE_DEMO is set only by the Pages workflow and the local demo-build command.
  base: process.env.VITE_DEMO ? '/investment-scanner/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy target defaults to the shared backend (:3000) but can be pointed at a
      // dedicated worktree backend on an offset port via VITE_API_PROXY_TARGET — used by
      // per-session worktree QA stacks (frontend on an offset port → its own backend).
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: (process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000').replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
})
