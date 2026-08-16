import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/php': {
        target: 'http://127.0.0.1:8888/mobile-app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

