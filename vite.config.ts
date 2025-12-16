import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 確保 process.env 在瀏覽器端可以被讀取 (為了 API Key)
    'process.env': process.env
  }
})