// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // IMPORTANT: ensures correct asset paths on root domain
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
