import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數 (包含 .env 檔案與 Vercel 系統變數)
  // 第三個參數 '' 表示載入所有變數，不限制前綴
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // 明確將 API_KEY 注入到前端程式碼中，比直接 process.env 更穩定
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})