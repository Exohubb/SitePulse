import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // In dev: forwards /api calls to FastAPI backend
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
