import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'stripe': ['@stripe/stripe-js'],
          'icons': ['react-icons']
        }
      }
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    }
  }
})