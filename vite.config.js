import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // כל קריאה ל-/api מועברת לשרת הפרוקסי
      '/api': 'http://localhost:3001',
    },
  },
})
