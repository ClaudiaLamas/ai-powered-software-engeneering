import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// Endereço da API (frontend/.env); as variáveis do ambiente têm prioridade.
const apiUrl = loadEnv('', process.cwd(), 'VITE_').VITE_API_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    // Em desenvolvimento, /api vai para o backend de VITE_API_URL (frontend/.env);
    // assim o backend não precisa de CORS.
    proxy: {
      '/api': {
        target: apiUrl,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
