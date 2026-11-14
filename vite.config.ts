import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 개발 중에는 /api 요청을 로컬 백엔드(Vinus-Backend, 8000번)로 넘깁니다.
// 배포 시에는 VITE_API_URL 에 백엔드 주소를 넣습니다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
