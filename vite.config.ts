import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    // Même origine que l'API : la session Django passe par cookie (docs/API.md).
    proxy: { '/api': 'http://localhost:8000' },
  },
})
