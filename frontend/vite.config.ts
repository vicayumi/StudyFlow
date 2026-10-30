import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const ambiente = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: ambiente.VITE_BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
