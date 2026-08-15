import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    // Lazy-loaded dependencies must use the same React instance as the app.
    // Without this, a stale Vite dependency chunk can produce an invalid
    // hook dispatcher when DiscountPopup is loaded after the initial render.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Keep React dependencies deduplicated across lazy route chunks.
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
    ],
  },
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
      // Never let the browser reuse source or optimized dependency modules
      // from a previous dev-server run. Mixing cached React and ReactDOM
      // chunks causes "Invalid hook call" dispatcher failures.
      'Cache-Control': 'no-store',
    }
  }
})
