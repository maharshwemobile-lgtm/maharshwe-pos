import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/pos/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4000",
      "/pos/api": {
        target: "http://127.0.0.1:4000",
        rewrite: (path) => path.replace(/^\/pos\/api/, "/api"),
      },
    },
  },
}));
