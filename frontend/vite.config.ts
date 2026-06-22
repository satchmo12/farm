import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/auth/telegram': 'http://127.0.0.1:8787',
      '/plant': 'http://127.0.0.1:8787',
      '/harvest': 'http://127.0.0.1:8787',
    },
  },
})
