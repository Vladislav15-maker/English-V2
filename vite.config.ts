import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ЭТОТ БЛОК ВАЖЕН
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Предполагая, что Vercel CLI запускает функции на порту 3000
        changeOrigin: true,
      },
    },
  },
})