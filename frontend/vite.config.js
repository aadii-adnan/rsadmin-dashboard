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
    // DiscountPopup is loaded lazily, so make its React wrapper part of the
    // initial dependency optimization pass instead of discovering it later.
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@lottiefiles/dotlottie-react',
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
      'Cache-Control': 'public, max-age=31536000',
    }
  }
})
