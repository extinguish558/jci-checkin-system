import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      // 提高單檔大小警告上限 (防止 build log 出現黃字警告)
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // 將大型第三方套件拆分為獨立檔案，優化瀏覽器快取
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('@google/genai')) return 'genai';
              if (id.includes('xlsx')) return 'xlsx';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('react')) return 'vendor';
            }
          }
        }
      }
    }
  }
})