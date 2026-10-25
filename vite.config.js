import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, /api é encaminhado para o servidor Express (npm run api)
    proxy: { '/api': `http://localhost:${process.env.PORT ?? 3001}` },
  },
})
